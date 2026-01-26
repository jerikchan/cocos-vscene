# VScene Data Structure Reference

## Directory Layout

```
.vscene/
├── manifest.json              # Scene registry
└── scenes/
    ├── gameScene.json         # Per-scene index
    └── uiScene.json
```

---

## manifest.json

```json
{
  "version": "1.0",
  "config": {
    "autoSync": true,
    "staleThresholdHours": 1,
    "expiredThresholdHours": 24
  },
  "scenes": {
    "gameScene": {
      "uuid": "scene-uuid-xxx",
      "path": "db://assets/scenes/gameScene.scene",
      "pulledAt": "2025-01-26T10:00:00Z",
      "nodeCount": 856,
      "maxDepth": 8
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Schema version |
| `config.autoSync` | boolean | Enable auto-sync behavior |
| `config.staleThresholdHours` | number | Hours before warning |
| `config.expiredThresholdHours` | number | Hours before asking update |
| `scenes[name].uuid` | string | Scene asset UUID |
| `scenes[name].path` | string | Scene asset path (db://) |
| `scenes[name].pulledAt` | string | ISO timestamp of last pull |
| `scenes[name].nodeCount` | number | Total node count |
| `scenes[name].maxDepth` | number | Maximum hierarchy depth |

---

## Scene Index (scenes/{name}.json)

### Full Schema

```json
{
  "meta": {
    "name": "gameScene",
    "uuid": "scene-uuid-xxx",
    "path": "db://assets/scenes/gameScene.scene",
    "pulledAt": "2025-01-26T10:00:00Z",
    "stats": {
      "nodes": 856,
      "depth": 8,
      "keyNodes": 23
    }
  },
  "root": {
    "u": "root-uuid",
    "n": "Scene",
    "c": ["Root", "GameAssets"],
    "k": true,
    "d": 0,
    "_": [
      {
        "u": "child-uuid",
        "n": "Managers",
        "c": [],
        "d": 1,
        "_": []
      }
    ]
  },
  "index": {
    "byName": {
      "Player": "uuid-xxx",
      "GameManager": "uuid-yyy"
    },
    "byType": {
      "GameManager": ["uuid-yyy"],
      "EnemyController": ["uuid-a", "uuid-b", "uuid-c"]
    },
    "keyNodes": ["uuid-yyy", "uuid-zzz"]
  }
}
```

---

## VNode Structure

Each node in the tree uses compact field names:

```json
{
  "u": "550e8400-e29b-41d4-a716-446655440000",
  "n": "GameManager",
  "c": ["GameManager", "AudioListener"],
  "k": true,
  "d": 2,
  "_": []
}
```

### Field Reference

| Field | Full Name | Type | Required | Description |
|-------|-----------|------|----------|-------------|
| `u` | uuid | string | ✅ | Node UUID from Cocos |
| `n` | name | string | ✅ | Node display name |
| `c` | components | string[] | ✅ | Non-engine component types |
| `k` | key | boolean | ❌ | True if key node (omit if false) |
| `d` | depth | number | ✅ | Hierarchy depth (root = 0) |
| `_` | children | VNode[] | ✅ | Child nodes (empty array if leaf) |

### Component Filtering Rules

**Included in `c` array:**
- Custom components (project scripts)
- Important engine components: `Sprite`, `Label`, `Button`, etc.

**Excluded from `c` array:**
- Transform components: `cc.UITransform`, `cc.Transform`
- Layout components: `cc.Widget`, `cc.Layout`
- Render internals: `cc.MeshRenderer` (unless needed)

---

## Index Tables

### byName

Fast lookup by node name. For duplicate names, stores the first occurrence.

```json
{
  "byName": {
    "Player": "uuid-player",
    "Enemy": "uuid-enemy-1"
  }
}
```

### byType

Find all nodes with specific component type.

```json
{
  "byType": {
    "EnemyController": ["uuid-1", "uuid-2", "uuid-3"],
    "Spawner": ["uuid-spawner"]
  }
}
```

### keyNodes

Quick access to important nodes.

```json
{
  "keyNodes": [
    "uuid-game-manager",
    "uuid-player",
    "uuid-main-camera"
  ]
}
```

---

## Size Optimization Techniques

### 1. Compact Field Names

| Original | Compact | Savings |
|----------|---------|---------|
| `uuid` | `u` | 3 bytes/node |
| `name` | `n` | 3 bytes/node |
| `components` | `c` | 9 bytes/node |
| `children` | `_` | 7 bytes/node |

### 2. Omit Default Values

```json
// Bad: explicit false
{ "u": "xxx", "n": "Node", "c": [], "k": false, "d": 1, "_": [] }

// Good: omit k when false
{ "u": "xxx", "n": "Node", "c": [], "d": 1, "_": [] }
```

### 3. Filter Engine Components

Only store business-relevant components, not every `cc.UITransform`.

### 4. Estimate Formula

```
Index Size ≈ nodeCount × 50 bytes (average)

1000 nodes × 50 bytes = 50 KB
```
