---
name: cocos-vscene
description: |
  Cocos Creator Virtual Scene Index System - Lightweight scene structure cache with progressive loading.

  Core value:
  - Local index: Fast node lookup without querying MCP every time
  - Progressive loading: Large scenes load in layers to avoid context explosion
  - Offline ready: read mode works without MCP connection

  Triggers:
  (1) "vscene pull" / "拉取场景索引" → Build local index
  (2) "vscene read" / "读取场景" → Read from index
  (3) "vscene read --depth N" → Progressive load with depth
  (4) "vscene find xxx" → Search nodes in index
  (5) "vscene detail uuid" → Query node details via MCP
  (6) "vscene diff" → Compare index with real scene
  (7) "vscene status" → View index status

  Keywords: vscene, scene index, progressive loading, scene cache, node lookup, Cocos Creator
---

# Cocos VScene - Lightweight Scene Index

## Design Philosophy

**VScene is an INDEX, not a backup**

| Principle | Description |
|-----------|-------------|
| Index only | Store name, path, component types - NOT property values |
| Query on demand | Fetch details via MCP when needed |
| Progressive load | Load large scenes in layers |
| AI friendly | Minimal structure for fast lookup |

```
Index (< 50KB)              Details (MCP on-demand)
┌──────────────┐           ┌──────────────┐
│ Node paths    │ ────────► │ Properties   │
│ Component list│  query    │ References   │
│ Key markers   │           │ Live state   │
└──────────────┘           └──────────────┘
```

---

## Commands

| Command | MCP Required | Description |
|---------|--------------|-------------|
| `vscene pull` | ✅ | Build index from editor |
| `vscene read [--depth N]` | ❌ | Read from cache (default depth: 3) |
| `vscene find <pattern>` | ❌ | Search nodes by name/type |
| `vscene detail <uuid>` | ✅ | Get full node properties |
| `vscene diff` | ✅ | Compare index vs real scene |
| `vscene status` | ❌ | Show cache status |

---

## Quick Start

### First time setup
```bash
vscene pull          # Build index (requires MCP)
vscene read          # View structure (depth 3)
```

### Find specific nodes
```bash
vscene find Manager           # Search by name
vscene find --type Trigger    # Search by component
vscene detail GameManager     # Get full properties
```

### Offline work
```bash
vscene read          # Works without MCP
vscene find xxx      # Works without MCP
```

---

## Index Structure

Directory: `{project}/.vscene/`

```
.vscene/
├── manifest.json              # Scene manifest (< 1KB)
└── scenes/
    └── {sceneName}.json       # Scene index (< 50KB per scene)
```

### VNode Format (Compact)

```json
{
  "u": "uuid",
  "n": "NodeName",
  "c": ["GameManager", "AudioSource"],
  "k": true,
  "d": 0,
  "_": []
}
```

| Field | Full name | Description |
|-------|-----------|-------------|
| `u` | uuid | Node UUID |
| `n` | name | Node name |
| `c` | components | Component type names (excludes cc.* engine components) |
| `k` | key | Is key node (has important components) |
| `d` | depth | Hierarchy depth |
| `_` | children | Child nodes array |

### Index Tables

```json
{
  "index": {
    "byName": { "Player": "uuid-xxx" },
    "byType": { "GameManager": ["uuid-yyy"] },
    "keyNodes": ["uuid-yyy", "uuid-zzz"]
  }
}
```

---

## Output Format

### vscene read (depth: 3)

```
## VScene: gameScene (856 nodes, depth 8)
Cached: 2025-01-26 10:00

SceneRoot [Root, GameAssets] ★
├─ Managers
│  ├─ GameManager [GameManager] ★
│  └─ AudioManager [AudioManager] ★
├─ World
│  ├─ Player [PlayerController] ★
│  ├─ Enemies [+45 nodes]
│  └─ Environment [+120 nodes]
└─ UI [+35 nodes]

★ = Key node | [+N] = Collapsed, use --depth or --from to expand
```

### vscene find Enemy*

```
## Search: "Enemy*" (12 matches)

| Node | Path | Components | UUID |
|------|------|------------|------|
| Enemy_001 | /World/Enemies/Enemy_001 | EnemyController | abc123 |
| EnemySpawner | /World/EnemySpawner | Spawner | def456 |
```

---

## Key Node Detection

Nodes with these components are marked as key (`k: true`):

**Priority 1 (Always):**
- `*Manager`, `*Controller`, `*System`, `Root`
- `*Assets`, `*Factory`, `*Spawner`

**Priority 2 (Business):**
- `*Trigger`, `*Handler`, `*Generator`
- Any custom component (not `cc.*` prefixed)

---

## Auto-sync Behavior

VScene automatically maintains index freshness:

| Trigger | MCP Available | MCP Unavailable |
|---------|---------------|-----------------|
| read: no index | **Auto pull** | Error, prompt to start editor |
| read: index >1h | Return + warn stale | Return with cache time |
| read: index >24h | Ask to update | Return with warning |
| detail: node not in index | **Incremental sync** | Error |
| detail: MCP query fails | Suggest pull | - |

See [references/auto-sync.md](references/auto-sync.md) for detailed flow.

---

## Size Optimization

| Scene Size | Index Size | read depth=3 Context |
|------------|------------|----------------------|
| 100 nodes | ~5 KB | ~2 KB |
| 500 nodes | ~25 KB | ~5 KB |
| 1000 nodes | ~50 KB | ~8 KB |
| 2000 nodes | ~100 KB | ~10 KB |

**Key:** Only expand specified depth, collapse deeper as `[+N]`

---

## Detailed References

- [references/data-structure.md](references/data-structure.md) - Full JSON schema
- [references/auto-sync.md](references/auto-sync.md) - Auto-sync flow details
- [references/mcp-integration.md](references/mcp-integration.md) - MCP API usage

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| MCP disconnected + has cache | read/find/status work in offline mode |
| MCP disconnected + no cache | Error, prompt to start editor and pull |
| Index corrupted | Auto rebuild |
| Node in index but MCP can't find | Suggest pull to resync |
