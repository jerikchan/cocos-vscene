# Analysis Document Template

This template defines the structure for `.vscene/analysis/{sceneName}.analysis.md` files.

---

## Template Structure

```markdown
# {SceneName} 场景质量分析

> **Analysis Date**: {YYYY-MM-DD HH:mm}
> **Scene Stats**: {nodeCount} nodes | depth {maxDepth} | {keyNodeCount} key nodes
> **Index Version**: {indexVersion}

---

## 📊 Quality Score Card (质量评分卡)

### Overall Score: {score}/100 {emoji}

| Dimension | Score | Status | Key Issues |
|-----------|-------|--------|------------|
| Structure (结构) | {s}/30 | {emoji} | {brief issue} |
| Naming (命名) | {n}/20 | {emoji} | {brief issue} |
| Code-Scene (代码-场景) | {c}/30 | {emoji} | {brief issue} |
| Maintainability (可维护性) | {m}/20 | {emoji} | {brief issue} |

**Score Level**: {level} - {description}

---

## 🏗️ Scene Structure Overview (场景结构概览)

### Hierarchy Tree (层级树)

\`\`\`
{sceneName}                              # {desc}
├─ {nodeName} [{components}]            # {desc}
│  ├─ {childName}                       # {desc}
│  └─ {childName} ⚠️                    # {desc} [Issue: {issueId}]
├─ {nodeName} ★                         # {desc} - Key Node
│  └─ [+{count} nodes]                  # {collapsed reason}
└─ {nodeName}                           # {desc}

Legend:
★ = Key node (关键节点)
⚠️ = Has issues (存在问题)
[+N] = Collapsed branch (折叠分支)
\`\`\`

### Depth Analysis (深度分析)

| Depth | Node Count | Percentage | Notes |
|-------|------------|------------|-------|
| 0 | 1 | 0.4% | Scene root |
| 1 | {n} | {p}% | Main branches |
| 2 | {n} | {p}% | Module roots |
| ... | ... | ... | ... |

**Max Depth**: {maxDepth} {depthAssessment}

---

## 📦 Module Analysis (模块分析)

### Identified Modules (已识别模块)

| Module | Root Node | Node Count | Key Components | Purpose |
|--------|-----------|------------|----------------|---------|
| UI System | Canvas | {n} | Canvas, Widget | 用户界面 |
| Logic Core | LogicRoot | {n} | *Manager, *Controller | 核心业务逻辑 |
| Player | LogicRoot/Player | {n} | SkeletalAnimation | 玩家角色控制 |
| Unlock System | LogicRoot/Unlock | {n} | ProgressBar | 解锁机制 |
| Environment | node1 | {n} | MeshRenderer | 环境装饰 |

### Module Dependency Graph (模块依赖图)

\`\`\`
┌─────────────┐     manages     ┌─────────────┐
│ LogicRoot   │ ───────────────► │   Player    │
└─────────────┘                  └─────────────┘
       │                                │
       │ controls                       │ triggers
       ▼                                ▼
┌─────────────┐     updates     ┌─────────────┐
│   Unlock    │ ───────────────► │ Buildings   │
└─────────────┘                  └─────────────┘
\`\`\`

---

## 🔗 Code-Scene Relations (代码-场景关系)

### Scene References in Code (代码中的场景引用)

| File | Line | Pattern | Target Node | Status |
|------|------|---------|-------------|--------|
| PlayerController.ts | 45 | getChildByName("Body") | Player/Body | ✅ Found |
| GameManager.ts | 120 | find("Canvas/JoystickUI") | Canvas/JoystickUI | ✅ Found |
| UnlockZone.ts | 67 | getChildByName("Bar") | OvenZone/Bar | ✅ Found |
| ItemDrop.ts | 89 | find("World/Items") | - | ❌ Not Found |

### Component Distribution (组件分布)

| Component Type | Count | Nodes | Notes |
|----------------|-------|-------|-------|
| ProgressBar | 5 | OvenZone, HelperZone, ... | Unlock progress |
| SkeletalAnimation | 3 | Player, Helper, FishingMachine | Character animation |
| LocalizedLabel | 6 | Various labels | i18n support |
| ParticleSystem | 12 | Build effects | Visual feedback |

### Hardcoded Path Analysis (硬编码路径分析)

| Severity | File | Line | Path | Suggestion |
|----------|------|------|------|------------|
| ⚠️ High | GameMgr.ts | 45 | "Canvas/UI/Panel/Btn" | Use @property reference |
| ⚠️ Medium | Player.ts | 120 | "Body/Weapon" | Use child index or tag |
| ✅ Low | UI.ts | 30 | "Label" | Acceptable (1 level) |

---

## ⚠️ Issues & Suggestions (问题与建议)

### Critical Issues (严重问题) 🚨

| ID | Category | Description | Location | Suggestion |
|----|----------|-------------|----------|------------|
| C-001 | Code-Scene | Orphan reference: "World/Items" not in scene | ItemDrop.ts:89 | Remove or create node |

### Warnings (警告) ⚠️

| ID | Category | Description | Location | Suggestion |
|----|----------|-------------|----------|------------|
| S-001 | Structure | node1, node3 are non-semantic names | Scene root level | Rename to Environment, Decoration |
| S-002 | Structure | Max depth 8 exceeds recommended 6 | UnlockBuildings branch | Flatten hierarchy |
| N-001 | Naming | Inconsistent casing: "weilan" vs "LogicRoot" | Multiple locations | Use PascalCase consistently |
| N-002 | Naming | Chinese pinyin names (weilan, wuliao, ziran) | node1 children | Use English or add comments |
| M-001 | Maintainability | Similar Zone structures repeated 4 times | Unlock/* | Extract to Prefab |

### Improvement Suggestions (改进建议) 💡

| Priority | Category | Suggestion | Impact |
|----------|----------|------------|--------|
| High | Structure | Group environment nodes under "Environment" instead of "node1" | +3 Structure |
| High | Naming | Rename node1→Environment, node3→Decoration | +4 Naming |
| Medium | Code-Scene | Replace hardcoded paths with @property references | +5 Code-Scene |
| Medium | Maintainability | Create UnlockZone prefab for OvenZone, HelperZone, etc. | +3 Maintainability |
| Low | Naming | Add Chinese comments to all key nodes | +2 Naming |

---

## 📈 Score Breakdown (评分明细)

### Structure Score: {s}/30

| Rule | Max | Actual | Notes |
|------|-----|--------|-------|
| Max depth ≤ 6 | 10 | {x} | Depth is {d}, {assessment} |
| Logic grouped under one root | 10 | {x} | LogicRoot exists ✅ |
| UI under Canvas | 5 | {x} | All UI in Canvas ✅ |
| Clear module separation | 5 | {x} | {assessment} |

### Naming Score: {n}/20

| Rule | Max | Actual | Notes |
|------|-----|--------|-------|
| PascalCase for nodes | 5 | {x} | {violations} violations |
| Semantic names | 5 | {x} | node1, node3 are non-semantic |
| Consistent prefixes | 5 | {x} | {assessment} |
| Chinese comments for key nodes | 5 | {x} | {missing} key nodes missing comments |

### Code-Scene Score: {c}/30

| Rule | Max | Actual | Notes |
|------|-----|--------|-------|
| No deep hardcoded paths | 10 | {x} | {violations} violations found |
| References match scene | 10 | {x} | {orphans} orphan references |
| Components on appropriate nodes | 5 | {x} | {assessment} |
| Events properly scoped | 5 | {x} | {assessment} |

### Maintainability Score: {m}/20

| Rule | Max | Actual | Notes |
|------|-----|--------|-------|
| Prefab for repeated structures | 5 | {x} | {repeated} repeated structures |
| Single responsibility | 5 | {x} | {assessment} |
| No circular references | 5 | {x} | {assessment} |
| Clear data flow | 5 | {x} | {assessment} |

---

## 🔄 Iteration Log (迭代记录)

| Date | Version | Score | Changes | Reviewer |
|------|---------|-------|---------|----------|
| {date} | 1.0 | {score}/100 | Initial analysis | AI |

### Previous Reviews

_No previous reviews._

---

## 📋 Action Checklist (行动清单)

### Immediate (立即处理)

- [ ] [C-001] Fix orphan reference in ItemDrop.ts:89

### Short-term (短期)

- [ ] [S-001] Rename node1 → Environment
- [ ] [S-001] Rename node3 → Decoration
- [ ] [N-001] Standardize naming to PascalCase

### Long-term (长期)

- [ ] [M-001] Create UnlockZone prefab
- [ ] [S-002] Review and flatten deep hierarchies

---

## 🎯 Target Score (目标分数)

| Dimension | Current | Target | Gap |
|-----------|---------|--------|-----|
| Structure | {s}/30 | 25/30 | {gap} |
| Naming | {n}/20 | 18/20 | {gap} |
| Code-Scene | {c}/30 | 25/30 | {gap} |
| Maintainability | {m}/20 | 17/20 | {gap} |
| **Total** | {total}/100 | **85/100** | {gap} |

---

_Generated by VScene Analyzer v1.0_
```

---

## Field Descriptions

### Score Emojis

| Score Range | Emoji |
|-------------|-------|
| 90%+ | 🌟 |
| 75-89% | ✅ |
| 60-74% | ⚠️ |
| 40-59% | ❌ |
| <40% | 🚨 |

### Issue ID Format

| Prefix | Category |
|--------|----------|
| C-xxx | Critical |
| S-xxx | Structure |
| N-xxx | Naming |
| CS-xxx | Code-Scene |
| M-xxx | Maintainability |

### Status Indicators

| Indicator | Meaning |
|-----------|---------|
| ✅ | Pass / Found / Good |
| ⚠️ | Warning / Needs attention |
| ❌ | Fail / Not found / Bad |
| 🚨 | Critical issue |
| 💡 | Suggestion |

---

## Generation Rules

1. **Always include all sections** - Even if a section is empty, include it with "None" or "N/A"
2. **Use consistent formatting** - Tables must align, code blocks must be properly fenced
3. **Provide actionable suggestions** - Each issue must have a concrete fix suggestion
4. **Link issues to scores** - Show how fixing issues improves scores
5. **Include iteration history** - Track changes over time for self-improvement
6. **Be bilingual** - Section headers in English, descriptions can be Chinese
