# Auto-sync Behavior Reference

VScene automatically maintains index freshness without manual intervention.

## Core Principle

**Index should be transparent** — users don't need to manually maintain it.

---

## Freshness Levels

```typescript
type FreshnessLevel = 'fresh' | 'stale' | 'expired';

function checkFreshness(pulledAt: string): FreshnessLevel {
  const ageHours = (Date.now() - new Date(pulledAt).getTime()) / 3600000;

  if (ageHours < 1) return 'fresh';      // < 1 hour
  if (ageHours < 24) return 'stale';     // 1-24 hours
  return 'expired';                       // > 24 hours
}
```

---

## Auto-sync Flow Charts

### 1. vscene read

```
vscene read [--depth N]
         │
         ▼
┌─────────────────┐
│ Index exists?   │
└────────┬────────┘
         │
    No ──┼── Yes
         │     │
         ▼     ▼
┌─────────────┐ ┌─────────────────┐
│ MCP ready?  │ │ Check freshness │
└──────┬──────┘ └────────┬────────┘
       │                 │
  No ──┼── Yes      fresh ─┼─ stale ─┼─ expired
       │     │           │        │         │
       ▼     ▼           ▼        ▼         ▼
    Error  Auto       Return   Return    Ask user:
    msg    pull       data     + warn    "Update?"
              │                           │
              └──────────┬────────────────┘
                         ▼
                   Return data
```

### 2. vscene find

```
vscene find <pattern>
         │
         ▼
┌─────────────────┐
│ Index exists?   │
└────────┬────────┘
         │
    No ──┼── Yes
         │     │
         ▼     ▼
┌─────────────┐ ┌─────────────────┐
│ MCP ready?  │ │ Search in index │
└──────┬──────┘ └────────┬────────┘
       │                 │
  No ──┼── Yes           ▼
       │     │      Return results
       ▼     ▼
    Error  Auto pull
           then search
```

### 3. vscene detail

```
vscene detail <uuid|name>
         │
         ▼
┌─────────────────────┐
│ Resolve to UUID     │
│ (from index or arg) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ UUID in index?      │
└──────────┬──────────┘
           │
      No ──┼── Yes
           │     │
           ▼     ▼
┌───────────────┐ ┌─────────────────┐
│ MCP query     │ │ MCP query       │
│ by name/path  │ │ by UUID         │
└───────┬───────┘ └────────┬────────┘
        │                  │
   Found ─┼─ Not found     │
        │        │         │
        ▼        ▼         ▼
  Incremental  Error    Return
  sync to      msg      details
  index
```

### 4. vscene diff

```
vscene diff [--update]
         │
         ▼
┌─────────────────┐
│ Index exists?   │
└────────┬────────┘
         │
    No ──┼── Yes
         │     │
         ▼     ▼
      Error  ┌─────────────────┐
      msg    │ MCP ready?      │
             └────────┬────────┘
                      │
                 No ──┼── Yes
                      │     │
                      ▼     ▼
                   Error  ┌─────────────────┐
                   msg    │ Fetch real scene│
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │ Compare trees   │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │ --update flag?  │
                          └────────┬────────┘
                                   │
                              No ──┼── Yes
                                   │     │
                                   ▼     ▼
                            Show diff  Auto pull
                            report     if changed
```

---

## Output Examples

### Auto pull (no index)

```
User: vscene read

Claude:
⚠️ No index found, building automatically...
   Checking MCP connection... ✅
   Pulling scene gameScene...

✅ Index built (856 nodes, 42KB)

## VScene: gameScene
...
```

### Stale warning (1-24h)

```
User: vscene read

Claude:
## VScene: gameScene (856 nodes)
⚠️ Cached 3 hours ago, may be outdated

### Structure (depth: 3)
...

---
💡 Run `vscene diff` to check changes, or `vscene pull` to force update
```

### Expired prompt (>24h)

```
User: vscene read

Claude:
⚠️ Index is 2 days old. Update now?

Options:
1. [Y] Update index (requires MCP)
2. [N] Use cached data (may be inaccurate)
3. [S] Skip and show status

Your choice:
```

### Incremental sync (detail)

```
User: vscene detail NewEnemy

Claude:
⚠️ "NewEnemy" not in index, querying MCP...
✅ Found node, index updated

## Node Details: NewEnemy
Path: /World/Enemies/NewEnemy
UUID: abc-123-def
...
```

### Node deleted

```
User: vscene detail OldNode

Claude:
❌ Node "OldNode" exists in index but not found in scene.
   It may have been deleted.

💡 Run `vscene pull` to resync index
```

---

## Configuration

In `.vscene/manifest.json`:

```json
{
  "config": {
    "autoSync": true,
    "staleThresholdHours": 1,
    "expiredThresholdHours": 24
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `autoSync` | `true` | Enable auto-sync behavior |
| `staleThresholdHours` | `1` | Hours before showing warning |
| `expiredThresholdHours` | `24` | Hours before prompting update |

### Disable Auto-sync

```json
{
  "config": {
    "autoSync": false
  }
}
```

When disabled:
- No automatic pulls
- No freshness warnings
- Manual `vscene pull` required
