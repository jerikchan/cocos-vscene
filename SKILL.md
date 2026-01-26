---
name: cocos-vscene
description: |
  Cocos Creator Virtual Scene Index System - Lightweight scene structure cache with progressive loading and quality analysis.

  Core value:
  - Local index: Fast node lookup without querying MCP every time
  - Progressive loading: Large scenes load in layers to avoid context explosion
  - Offline ready: read mode works without MCP connection
  - Quality analysis: Score and review scene structure, code-scene relations

  Triggers:
  (1) "vscene pull" / "拉取场景索引" → Build local index
  (2) "vscene read" / "读取场景" → Read from index
  (3) "vscene read --depth N" → Progressive load with depth
  (4) "vscene find xxx" → Search nodes in index
  (5) "vscene detail uuid" → Query node details via MCP
  (6) "vscene diff" → Compare index with real scene
  (7) "vscene status" → View index status
  (8) "vscene analyze" / "分析场景" → Generate quality analysis with scoring
  (9) "vscene review" / "审查场景" → Self-check and iterate on analysis

  Keywords: vscene, scene index, progressive loading, scene cache, node lookup, Cocos Creator, scene analysis, quality score
---

# Cocos VScene - Scene Index & Analysis System

## Design Philosophy

**VScene = Index (索引) + Analysis (分析)**

```
┌─────────────────────────────────────────────────────────────┐
│                    VScene System                            │
├─────────────────────────┬───────────────────────────────────┤
│   Index Layer (索引层)   │      Analysis Layer (分析层)      │
├─────────────────────────┼───────────────────────────────────┤
│ • Fast lookup           │ • Structure quality scoring       │
│ • Node/Component cache  │ • Code-scene relation analysis    │
│ • Offline capable       │ • Business module identification  │
│ • Minimal context       │ • Self-check & iteration          │
└─────────────────────────┴───────────────────────────────────┘
```

| Principle | Description |
|-----------|-------------|
| Index only | Store name, path, component types - NOT property values |
| Query on demand | Fetch details via MCP when needed |
| Progressive load | Load large scenes in layers |
| AI friendly | Minimal structure for fast lookup |
| Quality scoring | Rate structure and code-scene relations |
| Self-iterating | Support review and improvement suggestions |

---

## Commands

| Command | MCP | Description |
|---------|-----|-------------|
| `vscene pull` | ✅ | Build/update index from editor |
| `vscene read [--depth N]` | ❌ | Read from cache (default depth: 3) |
| `vscene find <pattern>` | ❌ | Search nodes by name/type |
| `vscene detail <uuid>` | ✅ | Get full node properties |
| `vscene diff` | ✅ | Compare index vs real scene |
| `vscene status` | ❌ | View index status |
| `vscene analyze` | ✅ | **Generate quality analysis with scoring** |
| `vscene review` | ❌ | **Self-check analysis, suggest improvements** |

---

## Directory Structure

```
.vscene/
├── manifest.json                    # Scene manifest (场景清单)
├── scenes/
│   └── {sceneName}.json             # Scene index (场景索引)
└── analysis/
    └── {sceneName}.analysis.md      # Quality analysis (质量分析)
```

---

## Index Layer (索引层)

### VNode Format (Enhanced)

```json
{
  "u": "uuid",
  "n": "NodeName",
  "c": ["GameManager", "AudioSource"],
  "k": true,
  "d": 0,
  "role": "logic",
  "desc": "游戏逻辑根节点",
  "_": []
}
```

| Field | Full name | Description |
|-------|-----------|-------------|
| `u` | uuid | Node UUID |
| `n` | name | Node name |
| `c` | components | Component type names (excludes cc.* engine) |
| `k` | key | Is key node (has important components) |
| `d` | depth | Hierarchy depth |
| `role` | role | Node role: `logic`/`ui`/`render`/`data`/`container` |
| `desc` | description | One-line description (中文) |
| `_` | children | Child nodes array |

### Node Role Classification

| Role | Description | Examples |
|------|-------------|----------|
| `logic` | Business logic, controllers | GameManager, PlayerController |
| `ui` | User interface elements | Canvas, Button, Label |
| `render` | Visual elements only | MeshRenderer, Sprite (no script) |
| `data` | Data containers | ConfigNode, AssetsNode |
| `container` | Organizational grouping | Managers, World, UI |

---

## Analysis Layer (分析层)

### analyze Command Flow

```
vscene analyze
  │
  ├─ Step 1: Check/Load Index
  │   └─ If no index → auto pull
  │
  ├─ Step 2: Structure Analysis (结构分析)
  │   ├─ Hierarchy depth analysis
  │   ├─ Node naming conventions
  │   ├─ Module organization
  │   └─ Component distribution
  │
  ├─ Step 3: Code-Scene Relation Analysis (代码-场景关系分析)
  │   ├─ Grep: getChildByName / find patterns
  │   ├─ Grep: getComponent patterns
  │   ├─ Match code references to scene nodes
  │   └─ Identify missing/orphan references
  │
  ├─ Step 4: Quality Scoring (质量评分)
  │   ├─ Structure Score (结构分)
  │   ├─ Naming Score (命名分)
  │   ├─ Code-Scene Coupling Score (耦合分)
  │   └─ Overall Score (总分)
  │
  ├─ Step 5: Generate Issues & Suggestions (问题与建议)
  │   ├─ Critical issues (严重��题)
  │   ├─ Warnings (警告)
  │   └─ Improvement suggestions (改进建议)
  │
  └─ Output: .vscene/analysis/{sceneName}.analysis.md
```

### Quality Scoring System (评分体系)

**Total Score: 100 points**

| Dimension | Weight | Criteria |
|-----------|--------|----------|
| **Structure (结构)** | 30 | Hierarchy depth, module organization, node grouping |
| **Naming (命名)** | 20 | Consistent naming, semantic clarity, no magic names |
| **Code-Scene (代码-场景)** | 30 | Clean references, no hardcoded paths, proper coupling |
| **Maintainability (可维护性)** | 20 | Component reuse, prefab usage, separation of concerns |

#### Scoring Rules

**Structure Score (30 points)**

| Rule | Points | Deduction |
|------|--------|-----------|
| Max depth ≤ 6 | +10 | -2 per level over 6 |
| Logic nodes grouped under one root | +10 | -5 if scattered |
| UI nodes under Canvas | +5 | -5 if mixed |
| Clear module separation | +5 | -2 per violation |

**Naming Score (20 points)**

| Rule | Points | Deduction |
|------|--------|-----------|
| PascalCase for nodes | +5 | -1 per violation |
| Semantic names (not node1, node2) | +5 | -2 per violation |
| Consistent prefixes (e.g., UI_, Btn_) | +5 | -1 per inconsistency |
| Chinese comments for key nodes | +5 | -1 per missing |

**Code-Scene Score (30 points)**

| Rule | Points | Deduction |
|------|--------|-----------|
| No hardcoded getChildByName paths >2 levels | +10 | -2 per violation |
| Scene references match actual nodes | +10 | -5 per orphan ref |
| Components attached to appropriate nodes | +5 | -2 per misplacement |
| Events properly scoped | +5 | -2 per global leak |

**Maintainability Score (20 points)**

| Rule | Points | Deduction |
|------|--------|-----------|
| Prefab usage for repeated structures | +5 | -2 per copy-paste |
| Single responsibility per component | +5 | -2 per god component |
| No circular references | +5 | -5 per cycle |
| Clear data flow direction | +5 | -2 per unclear flow |

#### Score Levels

| Score | Level | Emoji | Description |
|-------|-------|-------|-------------|
| 90-100 | Excellent | 🌟 | Production ready, well architected |
| 75-89 | Good | ✅ | Minor issues, acceptable |
| 60-74 | Fair | ⚠️ | Needs improvement before release |
| 40-59 | Poor | ❌ | Significant refactoring needed |
| 0-39 | Critical | 🚨 | Architectural problems, redesign required |

---

### review Command (Self-Check & Iterate)

```
vscene review
  │
  ├─ Step 1: Load existing analysis
  │
  ├─ Step 2: Verify issues still exist
  │   └─ Re-check each reported issue
  │
  ├─ Step 3: Check if suggestions implemented
  │   └─ Compare with previous analysis
  │
  ├─ Step 4: Update scores
  │   └─ Recalculate based on current state
  │
  └─ Output: Updated analysis with delta
```

**Review Output Example:**

```markdown
## Review: gameScene

### Score Change
| Dimension | Previous | Current | Delta |
|-----------|----------|---------|-------|
| Structure | 22/30 | 25/30 | +3 ✅ |
| Naming | 12/20 | 15/20 | +3 ✅ |
| Code-Scene | 20/30 | 20/30 | 0 |
| Total | 64/100 | 70/100 | +6 ✅ |

### Resolved Issues
- ✅ [S-001] node1 renamed to Environment
- ✅ [N-002] Added Chinese comments

### Remaining Issues
- ⚠️ [C-001] Still has hardcoded path in PlayerController.ts:45
```

---

## Analysis Document Template

See [references/analysis-template.md](references/analysis-template.md) for full template.

### Key Sections

1. **Header** - Scene name, stats, score summary
2. **Score Card** - Detailed scoring breakdown
3. **Structure Overview** - Annotated hierarchy tree
4. **Module Analysis** - Business module identification
5. **Code-Scene Relations** - Reference mapping table
6. **Issues & Suggestions** - Prioritized improvement list
7. **Iteration Log** - Review history

---

## Quick Start

### First Analysis

```bash
vscene pull              # Build index
vscene analyze           # Generate analysis
# Review .vscene/analysis/{scene}.analysis.md
```

### Iterate on Quality

```bash
# Make improvements to scene...
vscene review            # Check progress
vscene analyze           # Full re-analysis
```

### Check Specific Issues

```bash
vscene find node*        # Find poorly named nodes
vscene detail <uuid>     # Inspect specific node
```

---

## Index Output Format

### vscene read (depth: 3)

```
## VScene: gameScene (226 nodes, depth 8)
Cached: 2026-01-26 | Score: 72/100 ⚠️

gameScene                           # 场景根节点
├─ Main Light [DirectionalLight]    # 主光源
├─ Main Camera [CameraComponent]    # 主相机
├─ Canvas [Canvas] ★                # UI 画布
│  ├─ JoystickUI                   # 摇杆控制
│  └─ DragtoMove                   # 拖拽提示
├─ node1                           # ⚠️ 命名不规范
│  └─ [+36 nodes]
└─ LogicRoot ★                     # 逻辑根节点
   ├─ Player ★                     # 玩家角色
   ├─ Unlock ★                     # 解锁系统
   └─ UnlockBuildings ★            # 可解锁建筑

★ = Key node | ⚠️ = Has issues | [+N] = Collapsed
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

## Detailed References

- [references/data-structure.md](references/data-structure.md) - Full JSON schema
- [references/auto-sync.md](references/auto-sync.md) - Auto-sync flow details
- [references/mcp-integration.md](references/mcp-integration.md) - MCP API usage
- [references/analysis-template.md](references/analysis-template.md) - Analysis document template
- [references/scoring-rules.md](references/scoring-rules.md) - Detailed scoring criteria

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| MCP disconnected + has cache | read/find/status/review work offline |
| MCP disconnected + no cache | Error, prompt to start editor |
| MCP disconnected + analyze | Error, MCP required for full analysis |
| Index corrupted | Auto rebuild |
| Analysis outdated | Warn on read, suggest re-analyze |
