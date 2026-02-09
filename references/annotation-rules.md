# Map Annotation Inference Rules

Complete reference for how `vscene map` generates bilingual annotations.

---

## Strategy 1: Component Semantic Mapping

Exact component name matches:

| Component | EN Annotation | ZH Annotation |
|-----------|---------------|---------------|
| `Canvas` | `UI root` | `UI 根节点` |
| `Camera` / `CameraComponent` | `Camera` | `相机` |
| `DirectionalLight` | `Directional light` | `平行光` |
| `SpotLight` | `Spot light` | `聚光灯` |
| `PointLight` | `Point light` | `点光源` |
| `Button` | `Button` | `按钮` |
| `Label` | `Text label` | `文本标签` |
| `RichText` | `Rich text` | `富文本` |
| `Sprite` | `Sprite image` | `精灵图` |
| `ProgressBar` | `Progress bar` | `进度条` |
| `SkeletalAnimation` | `Skeletal animation` | `骨骼动画` |
| `Animation` | `Animation` | `动画` |
| `ParticleSystem` | `Particle effect` | `粒子特效` |
| `ScrollView` | `Scroll view` | `滚动视图` |
| `EditBox` | `Input field` | `输入框` |
| `Toggle` | `Toggle switch` | `开关` |
| `Slider` | `Slider` | `滑动条` |
| `Layout` | `Auto layout` | `自动布局` |
| `Widget` | `UI widget` | `UI 组件` |
| `MeshRenderer` | `3D mesh` | `3D 网格` |
| `Mask` | `Mask` | `遮罩` |
| `PageView` | `Page view` | `翻页视图` |
| `UIOpacity` | `Opacity control` | `透明度控制` |

Component suffix patterns (regex-matched):

| Suffix Pattern | EN Template | ZH Template |
|----------------|-------------|-------------|
| `*Manager` | `{Name} manager` | `{Name}管理器` |
| `*Controller` | `{Name} controller` | `{Name}控制器` |
| `*System` | `{Name} system` | `{Name}系统` |
| `*Spawner` | `{Name} spawner` | `{Name}生成器` |
| `*Factory` | `{Name} factory` | `{Name}工厂` |
| `*Handler` | `{Name} handler` | `{Name}处理器` |
| `*Trigger` | `{Name} trigger` | `{Name}触发器` |
| `*Generator` | `{Name} generator` | `{Name}生成器` |

---

## Strategy 2: Node Name Translation

Common English game node names mapped to Chinese:

| EN Name | ZH | | EN Name | ZH |
|---------|----|-|---------|-----|
| player | 玩家 | | enemy | 敌人 |
| camera | 相机 | | light | 灯光 |
| ground | 地面 | | wall | 墙壁 |
| background | 背景 | | foreground | 前景 |
| environment | 环境 | | world | 世界 |
| level | 关卡 | | stage | 舞台 |
| root | 根节点 | | effects | 特效 |
| ui | UI | | hud | HUD |
| menu | 菜单 | | panel | 面板 |
| popup | 弹窗 | | dialog | 对话框 |
| audio | 音频 | | sound | 声音 |
| spawn | 生成点 | | trigger | 触发器 |
| obstacle | 障碍物 | | item | 物品 |
| weapon | 武器 | | score | 分数 |
| coin | 金币 | | shadow | 阴影 |
| body | 身体 | | building | 建筑 |
| decoration | 装饰 | | prop | 道具 |
| npc | NPC | | boss | Boss |
| tree | 树 | | rock | 岩石 |
| water | 水 | | sky | 天空 |

Also matches compound names by suffix (e.g. `LogicRoot` matches `root` → `Logic根节点`).

---

## Strategy 3: Container Inference

For nodes with no components but with children:

| Condition | EN | ZH |
|-----------|----|----|
| >50% children share a component | `{Component} group` | `{Component}组` |
| Name ends with `Root` | `{Prefix} root` | `{Prefix}根节点` |
| Default | `Container` | `容器` |

---

## Strategy 4: Ambiguous Name Detection

**Checked before name translation** to avoid translating meaningless names.

| Pattern | Matches | Result |
|---------|---------|--------|
| `/^node\d*$/i` | node, node1, node2 | `unnamed / 未命名 [?]` |
| `/^New Node$/i` | New Node | `unnamed / 未命名 [?]` |
| `/^Node$/i` | Node | `unnamed / 未命名 [?]` |
| `/^GameObject\d*$/i` | GameObject, GameObject1 | `unnamed / 未命名 [?]` |
| `/^temp/i` | temp, tempNode | `unnamed / 未命名 [?]` |
| `/^test/i` | test, testBtn | `unnamed / 未命名 [?]` |
| `/^untitled/i` | untitled | `unnamed / 未命名 [?]` |

Pinyin-looking names (all-alpha, no dictionary match) are marked `[?]` uncertain.

---

## Strategy Priority

```
1. Component match → exact annotation (highest confidence)
2. Ambiguous detection → mark [?] (prevent bad translations)
3. Name translation → dictionary lookup
4. Container inference → from children types
5. Fallback → use name as-is, mark [?] if pinyin
```
