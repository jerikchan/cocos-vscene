/**
 * VScene Utility Functions
 *
 * Helper functions for VScene index operations.
 * These can be used by Claude to process scene data.
 */

// ============================================================
// Types
// ============================================================

interface VNode {
  u: string;      // uuid
  n: string;      // name
  c: string[];    // components
  k?: boolean;    // key node
  d: number;      // depth
  _: VNode[];     // children
}

interface VSceneIndex {
  meta: {
    name: string;
    uuid: string;
    path: string;
    pulledAt: string;
    stats: {
      nodes: number;
      depth: number;
      keyNodes: number;
    };
  };
  root: VNode;
  index: {
    byName: Record<string, string>;
    byType: Record<string, string[]>;
    keyNodes: string[];
  };
}

interface Manifest {
  version: string;
  config: {
    autoSync: boolean;
    staleThresholdHours: number;
    expiredThresholdHours: number;
  };
  scenes: Record<string, {
    uuid: string;
    path: string;
    pulledAt: string;
    nodeCount: number;
    maxDepth: number;
  }>;
}

// ============================================================
// Key Node Detection
// ============================================================

const KEY_PATTERNS = [
  /Manager$/i,
  /Controller$/i,
  /System$/i,
  /Assets$/i,
  /Factory$/i,
  /Spawner$/i,
  /Trigger$/i,
  /Handler$/i,
  /Generator$/i,
  /^Root$/i,
];

function isKeyComponent(componentType: string): boolean {
  // Engine components are not key
  if (componentType.startsWith('cc.')) return false;

  // Check against patterns
  return KEY_PATTERNS.some(pattern => pattern.test(componentType));
}

function isKeyNode(components: string[]): boolean {
  // Any custom component makes it a key node
  const hasCustomComponent = components.some(c => !c.startsWith('cc.'));

  // Or matches key patterns
  const matchesKeyPattern = components.some(c => isKeyComponent(c));

  return hasCustomComponent || matchesKeyPattern;
}

// ============================================================
// Index Building
// ============================================================

function buildIndex(root: VNode): VSceneIndex['index'] {
  const byName: Record<string, string> = {};
  const byType: Record<string, string[]> = {};
  const keyNodes: string[] = [];

  function traverse(node: VNode) {
    // Index by name (first occurrence wins)
    if (!byName[node.n]) {
      byName[node.n] = node.u;
    }

    // Index by component type
    for (const comp of node.c) {
      if (!byType[comp]) {
        byType[comp] = [];
      }
      byType[comp].push(node.u);
    }

    // Track key nodes
    if (node.k) {
      keyNodes.push(node.u);
    }

    // Recurse
    for (const child of node._) {
      traverse(child);
    }
  }

  traverse(root);

  return { byName, byType, keyNodes };
}

// ============================================================
// Tree Rendering
// ============================================================

interface RenderOptions {
  maxDepth: number;
  fromUuid?: string;
  showUuid?: boolean;
}

function renderTree(root: VNode, options: RenderOptions): string {
  const lines: string[] = [];
  const { maxDepth, showUuid = false } = options;

  function countDescendants(node: VNode): number {
    let count = 1;
    for (const child of node._) {
      count += countDescendants(child);
    }
    return count;
  }

  function render(node: VNode, prefix: string, isLast: boolean) {
    const connector = isLast ? '└─' : '├─';
    const components = node.c.length > 0 ? ` [${node.c.join(', ')}]` : '';
    const keyMarker = node.k ? ' ★' : '';
    const uuidSuffix = showUuid ? ` (${node.u.slice(0, 8)})` : '';

    // Check if should collapse
    if (node.d >= maxDepth && node._.length > 0) {
      const descendantCount = countDescendants(node) - 1;
      lines.push(`${prefix}${connector} ${node.n}${components}${keyMarker} [+${descendantCount} nodes]`);
      return;
    }

    lines.push(`${prefix}${connector} ${node.n}${components}${keyMarker}${uuidSuffix}`);

    const newPrefix = prefix + (isLast ? '   ' : '│  ');
    for (let i = 0; i < node._.length; i++) {
      render(node._[i], newPrefix, i === node._.length - 1);
    }
  }

  // Render root specially (no connector)
  const rootComponents = root.c.length > 0 ? ` [${root.c.join(', ')}]` : '';
  const rootKey = root.k ? ' ★' : '';
  lines.push(`${root.n}${rootComponents}${rootKey}`);

  for (let i = 0; i < root._.length; i++) {
    render(root._[i], '', i === root._.length - 1);
  }

  return lines.join('\n');
}

// ============================================================
// Search Functions
// ============================================================

function findByName(
  root: VNode,
  pattern: string,
  index: VSceneIndex['index']
): VNode[] {
  const results: VNode[] = [];
  const isWildcard = pattern.includes('*');

  if (!isWildcard && index.byName[pattern]) {
    // Exact match via index
    const uuid = index.byName[pattern];
    const node = findNodeByUuid(root, uuid);
    if (node) results.push(node);
  } else {
    // Pattern search
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*') + '$',
      'i'
    );

    function traverse(node: VNode, path: string) {
      if (regex.test(node.n)) {
        results.push({ ...node, _path: path } as any);
      }
      for (const child of node._) {
        traverse(child, `${path}/${child.n}`);
      }
    }

    traverse(root, '/' + root.n);
  }

  return results;
}

function findByType(
  root: VNode,
  componentType: string,
  index: VSceneIndex['index']
): VNode[] {
  const results: VNode[] = [];
  const uuids = index.byType[componentType] || [];

  for (const uuid of uuids) {
    const node = findNodeByUuid(root, uuid);
    if (node) results.push(node);
  }

  return results;
}

function findNodeByUuid(root: VNode, uuid: string): VNode | null {
  if (root.u === uuid) return root;

  for (const child of root._) {
    const found = findNodeByUuid(child, uuid);
    if (found) return found;
  }

  return null;
}

function getNodePath(root: VNode, uuid: string): string | null {
  function traverse(node: VNode, path: string): string | null {
    if (node.u === uuid) return path;

    for (const child of node._) {
      const found = traverse(child, `${path}/${child.n}`);
      if (found) return found;
    }

    return null;
  }

  return traverse(root, '/' + root.n);
}

// ============================================================
// Freshness Check
// ============================================================

type FreshnessLevel = 'fresh' | 'stale' | 'expired';

function checkFreshness(
  pulledAt: string,
  staleHours: number = 1,
  expiredHours: number = 24
): FreshnessLevel {
  const ageMs = Date.now() - new Date(pulledAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours < staleHours) return 'fresh';
  if (ageHours < expiredHours) return 'stale';
  return 'expired';
}

function formatAge(pulledAt: string): string {
  const ageMs = Date.now() - new Date(pulledAt).getTime();
  const ageMinutes = Math.floor(ageMs / 60000);

  if (ageMinutes < 60) return `${ageMinutes}m ago`;
  const ageHours = Math.floor(ageMinutes / 60);
  if (ageHours < 24) return `${ageHours}h ago`;
  const ageDays = Math.floor(ageHours / 24);
  return `${ageDays}d ago`;
}

// ============================================================
// Map Functions
// ============================================================

interface MapAnnotation {
  en: string;
  zh: string;
  uncertain?: boolean;  // marked with [?]
}

interface MapNode {
  u: string;
  n: string;
  c: string[];
  k?: boolean;
  d: number;
  annotation: MapAnnotation;
  children: MapNode[];           // filtered children (not all)
  collapsedCount?: number;       // number of omitted children
  collapsedLabel?: string;       // e.g. "decoration nodes" / "装饰节点"
  repeatGroup?: {                // collapsed repeated siblings
    count: number;
    pattern: string;             // e.g. "Enemy*"
  };
}

interface MapResult {
  sceneName: string;
  totalNodes: number;
  shownNodes: number;
  collapsedGroups: number;
  maxDepth: number;
  shownMaxDepth: number;
  keyNodes: MapNode[];           // flat list for Quick Reference
  root: MapNode;
}

// Annotation inference: component pattern → bilingual description
const COMPONENT_ANNOTATIONS: Record<string, MapAnnotation> = {
  'Canvas':              { en: 'UI root',              zh: 'UI 根节点' },
  'Camera':              { en: 'Camera',               zh: '相机' },
  'CameraComponent':     { en: 'Camera',               zh: '相机' },
  'DirectionalLight':    { en: 'Directional light',    zh: '平行光' },
  'Button':              { en: 'Button',               zh: '按钮' },
  'Label':               { en: 'Text label',           zh: '文本标签' },
  'RichText':            { en: 'Rich text',            zh: '富文本' },
  'Sprite':              { en: 'Sprite image',         zh: '精灵图' },
  'ProgressBar':         { en: 'Progress bar',         zh: '进度条' },
  'SkeletalAnimation':   { en: 'Skeletal animation',   zh: '骨骼动画' },
  'Animation':           { en: 'Animation',            zh: '动画' },
  'ParticleSystem':      { en: 'Particle effect',      zh: '粒子特效' },
  'ScrollView':          { en: 'Scroll view',          zh: '滚动视图' },
  'EditBox':             { en: 'Input field',          zh: '输入框' },
  'Toggle':              { en: 'Toggle switch',        zh: '开关' },
  'Slider':              { en: 'Slider',               zh: '滑动条' },
  'Layout':              { en: 'Auto layout',          zh: '自动布局' },
  'Widget':              { en: 'UI widget',            zh: 'UI 组件' },
  'MeshRenderer':        { en: '3D mesh',              zh: '3D 网格' },
  'SpotLight':           { en: 'Spot light',           zh: '聚光灯' },
  'PointLight':          { en: 'Point light',          zh: '点光源' },
  'Mask':                { en: 'Mask',                 zh: '遮罩' },
  'PageView':            { en: 'Page view',            zh: '翻页视图' },
  'UIOpacity':           { en: 'Opacity control',      zh: '透明度控制' },
};

// Component suffix patterns → annotation templates
const COMPONENT_SUFFIX_PATTERNS: Array<{
  pattern: RegExp;
  en: (name: string) => string;
  zh: (name: string) => string;
}> = [
  { pattern: /^(.+)Manager$/i,    en: n => `${n} manager`,    zh: n => `${n}管理器` },
  { pattern: /^(.+)Controller$/i, en: n => `${n} controller`, zh: n => `${n}控制器` },
  { pattern: /^(.+)System$/i,     en: n => `${n} system`,     zh: n => `${n}系统` },
  { pattern: /^(.+)Spawner$/i,    en: n => `${n} spawner`,    zh: n => `${n}生成器` },
  { pattern: /^(.+)Factory$/i,    en: n => `${n} factory`,    zh: n => `${n}工厂` },
  { pattern: /^(.+)Handler$/i,    en: n => `${n} handler`,    zh: n => `${n}处理器` },
  { pattern: /^(.+)Trigger$/i,    en: n => `${n} trigger`,    zh: n => `${n}触发器` },
  { pattern: /^(.+)Generator$/i,  en: n => `${n} generator`,  zh: n => `${n}生成器` },
];

// Common English node names → Chinese translations
const NAME_TRANSLATIONS: Record<string, string> = {
  'player':       '玩家',
  'enemy':        '敌人',
  'camera':       '相机',
  'light':        '灯光',
  'ground':       '地面',
  'floor':        '地板',
  'wall':         '墙壁',
  'background':   '背景',
  'foreground':   '前景',
  'environment':  '环境',
  'world':        '世界',
  'level':        '关卡',
  'stage':        '舞台',
  'scene':        '场景',
  'root':         '根节点',
  'main':         '主要',
  'effects':      '特效',
  'particles':    '粒子',
  'ui':           'UI',
  'hud':          'HUD',
  'menu':         '菜单',
  'panel':        '面板',
  'popup':        '弹窗',
  'dialog':       '对话框',
  'overlay':      '覆盖层',
  'loading':      '加载',
  'settings':     '设置',
  'audio':        '音频',
  'sound':        '声音',
  'music':        '音乐',
  'spawn':        '生成点',
  'checkpoint':   '检查点',
  'trigger':      '触发器',
  'boundary':     '边界',
  'obstacle':     '障碍物',
  'collectible':  '收集物',
  'item':         '物品',
  'weapon':       '武器',
  'shield':       '盾牌',
  'health':       '生命值',
  'score':        '分数',
  'coin':         '金币',
  'gem':          '宝石',
  'shadow':       '阴影',
  'body':         '身体',
  'head':         '头部',
  'hand':         '手部',
  'foot':         '脚部',
  'container':    '容器',
  'group':        '组',
  'decoration':   '装饰',
  'prop':         '道具',
  'npc':          'NPC',
  'boss':         'Boss',
  'building':     '建筑',
  'tree':         '树',
  'rock':         '岩石',
  'water':        '水',
  'sky':          '天空',
  'cloud':        '云',
};

// Detect ambiguous / meaningless names
const AMBIGUOUS_PATTERNS = [
  /^node\d*$/i,             // node, node1, node2
  /^New Node$/i,            // default name
  /^Node$/i,                // generic
  /^GameObject\d*$/i,       // Unity-style default
  /^temp/i,                 // temporary
  /^test/i,                 // test
  /^untitled/i,             // untitled
];

function inferAnnotation(node: VNode): MapAnnotation {
  // Strategy 1: Component-based inference
  for (const comp of node.c) {
    // Exact component match
    if (COMPONENT_ANNOTATIONS[comp]) {
      return { ...COMPONENT_ANNOTATIONS[comp] };
    }
    // Suffix pattern match
    for (const sp of COMPONENT_SUFFIX_PATTERNS) {
      const match = comp.match(sp.pattern);
      if (match) {
        return { en: sp.en(match[1]), zh: sp.zh(match[1]) };
      }
    }
  }

  // Strategy 4 (check early): Ambiguous name detection
  if (AMBIGUOUS_PATTERNS.some(p => p.test(node.n))) {
    return { en: 'unnamed', zh: '未命名', uncertain: true };
  }

  // Strategy 2: Node name translation
  const nameLower = node.n.toLowerCase();
  if (NAME_TRANSLATIONS[nameLower]) {
    return { en: node.n, zh: NAME_TRANSLATIONS[nameLower] };
  }

  // Check if name ends with a known word (e.g. "LogicRoot" → root)
  for (const [word, zh] of Object.entries(NAME_TRANSLATIONS)) {
    if (nameLower.endsWith(word.toLowerCase()) && nameLower !== word.toLowerCase()) {
      const prefix = node.n.slice(0, node.n.length - word.length);
      return { en: `${prefix} ${word}`, zh: `${prefix}${zh}` };
    }
  }

  // Strategy 3: Container inference (no components, has children)
  if (node.c.length === 0 && node._.length > 0) {
    return inferContainerAnnotation(node);
  }

  // Fallback: use node name as-is, mark uncertain if looks like pinyin
  const isPinyin = /^[a-z]{2,}$/i.test(node.n) && !NAME_TRANSLATIONS[nameLower];
  if (isPinyin) {
    return { en: node.n, zh: node.n, uncertain: true };
  }

  return { en: node.n, zh: node.n };
}

// Caller guarantees node._.length > 0
function inferContainerAnnotation(node: VNode): MapAnnotation {
  // Check if children share a common component type
  const childCompCounts: Record<string, number> = {};
  for (const child of node._) {
    for (const comp of child.c) {
      childCompCounts[comp] = (childCompCounts[comp] || 0) + 1;
    }
  }

  const dominantComp = Object.entries(childCompCounts)
    .sort((a, b) => b[1] - a[1])[0];

  if (dominantComp && dominantComp[1] >= node._.length * 0.5) {
    const compName = dominantComp[0];
    const annotation = COMPONENT_ANNOTATIONS[compName];
    if (annotation) {
      return { en: `${annotation.en} group`, zh: `${annotation.zh}组` };
    }
    return { en: `${compName} group`, zh: `${compName} 组` };
  }

  // Name ends with "Root"
  if (/Root$/i.test(node.n)) {
    const prefix = node.n.replace(/Root$/i, '');
    return { en: `${prefix || 'Logic'} root`, zh: `${prefix || '逻辑'}根节点` };
  }

  return { en: 'Container', zh: '容器' };
}

/**
 * Extract a group prefix from a node name.
 * Tries each pattern independently (not chained) and returns the first match.
 */
function extractGroupPrefix(name: string): string | null {
  const patterns: Array<{ regex: RegExp; group: number }> = [
    { regex: /^(.+?)[\s_-]\d+$/, group: 1 },     // "Enemy_1", "tree-2", "node 3"
    { regex: /^(.+?)\d+$/, group: 1 },            // "Enemy1", "node2"
    { regex: /^(.+?)\s*\(\d+\)$/, group: 1 },     // "tree (1)", "node(2)"
    { regex: /^(.+?)_[A-Z][a-zA-Z]*$/, group: 1 },// "Zone_Oven" (capitalized suffix)
  ];

  for (const { regex, group } of patterns) {
    const match = name.match(regex);
    if (match && match[group]) {
      return match[group];
    }
  }

  return null;
}

/**
 * Detect repeated sibling groups.
 * Returns groups where >=3 siblings share a common prefix.
 */
function detectRepeatGroups(siblings: VNode[]): Map<string, VNode[]> {
  const groups = new Map<string, VNode[]>();

  // Extract common prefix from names (each pattern tried independently)
  const prefixMap = new Map<string, VNode[]>();
  for (const node of siblings) {
    const prefix = extractGroupPrefix(node.n);
    if (prefix) {
      if (!prefixMap.has(prefix)) {
        prefixMap.set(prefix, []);
      }
      prefixMap.get(prefix)!.push(node);
    }
  }

  // Second pass: include nodes whose name exactly equals a group prefix
  // (e.g. "Enemy" alongside "Enemy1", "Enemy2")
  for (const node of siblings) {
    for (const [prefix, nodes] of prefixMap) {
      if (node.n === prefix && !nodes.includes(node)) {
        nodes.push(node);
      }
    }
  }

  // Only keep groups with >= 3 members
  for (const [prefix, nodes] of prefixMap) {
    if (nodes.length >= 3) {
      groups.set(prefix, nodes);
    }
  }

  return groups;
}

/**
 * Check if a node has any key descendant (used for ancestor retention).
 */
function hasKeyDescendant(node: VNode): boolean {
  if (node.k) return true;
  return node._.some(child => hasKeyDescendant(child));
}

/**
 * Filter a scene tree into a MapNode tree for the map output.
 */
function filterForMap(root: VNode): MapResult {
  let totalNodes = 0;
  let shownNodes = 0;
  let collapsedGroups = 0;
  const keyNodesList: MapNode[] = [];

  function countAll(node: VNode): number {
    let count = 1;
    for (const child of node._) {
      count += countAll(child);
    }
    return count;
  }

  totalNodes = countAll(root);

  function process(node: VNode): MapNode {
    const annotation = inferAnnotation(node);
    const mapNode: MapNode = {
      u: node.u,
      n: node.n,
      c: node.c,
      k: node.k,
      d: node.d,
      annotation,
      children: [],
    };

    shownNodes++;

    if (node.k) {
      keyNodesList.push(mapNode);
    }

    if (node._.length === 0) {
      return mapNode;
    }

    // Determine which children to keep
    const keptChildren: VNode[] = [];
    const skippedChildren: VNode[] = [];

    // Detect repeat groups among siblings
    const repeatGroups = detectRepeatGroups(node._);
    const inRepeatGroup = new Set<string>();
    for (const nodes of repeatGroups.values()) {
      for (const n of nodes) {
        inRepeatGroup.add(n.u);
      }
    }

    for (const child of node._) {
      if (inRepeatGroup.has(child.u)) {
        continue; // handled by repeat group
      }

      const shouldKeep =
        child.d <= 1 ||                  // depth 0-1: always keep
        child.k ||                       // key node
        child.c.some(c => !c.startsWith('cc.')) ||  // has custom component
        hasKeyDescendant(child);          // ancestor of a key node

      if (shouldKeep) {
        keptChildren.push(child);
      } else {
        skippedChildren.push(child);
      }
    }

    // Process kept children recursively
    for (const child of keptChildren) {
      mapNode.children.push(process(child));
    }

    // Add repeat group entries
    for (const [prefix, nodes] of repeatGroups) {
      collapsedGroups++;
      shownNodes++;
      const sampleAnnotation = inferAnnotation(nodes[0]);
      mapNode.children.push({
        u: '',
        n: `${prefix}*`,
        c: nodes[0].c,
        d: nodes[0].d,
        annotation: sampleAnnotation,
        children: [],
        repeatGroup: { count: nodes.length, pattern: `${prefix}*` },
      });
    }

    // Add collapsed remainder
    if (skippedChildren.length > 0) {
      collapsedGroups++;
      mapNode.collapsedCount = skippedChildren.length;

      // Infer a label for collapsed nodes
      const hasRenderers = skippedChildren.some(c =>
        c.c.some(comp => ['MeshRenderer', 'Sprite', 'SpriteRenderer'].includes(comp))
      );
      const hasParticles = skippedChildren.some(c =>
        c.c.some(comp => comp === 'ParticleSystem')
      );

      if (hasParticles) {
        mapNode.collapsedLabel = 'particle nodes / 粒子节点';
      } else if (hasRenderers) {
        mapNode.collapsedLabel = 'decoration nodes / 装饰节点';
      } else {
        mapNode.collapsedLabel = 'child nodes / 子节点';
      }
    }

    return mapNode;
  }

  const mapRoot = process(root);

  // Calculate shown max depth
  function getMaxShownDepth(node: MapNode): number {
    if (node.children.length === 0) return node.d;
    return Math.max(node.d, ...node.children.map(getMaxShownDepth));
  }

  function getMaxDepth(node: VNode): number {
    if (node._.length === 0) return node.d;
    return Math.max(node.d, ...node._.map(getMaxDepth));
  }

  return {
    sceneName: root.n,
    totalNodes,
    shownNodes,
    collapsedGroups,
    maxDepth: getMaxDepth(root),
    shownMaxDepth: getMaxShownDepth(mapRoot),
    keyNodes: keyNodesList,
    root: mapRoot,
  };
}

/**
 * Render a MapNode tree as an annotated text tree for .map.md output.
 */
function renderMapTree(root: MapNode): string {
  const lines: string[] = [];
  const ANNOTATION_COL = 45; // column where annotations start

  function padTo(text: string, col: number): string {
    const padding = Math.max(1, col - text.length);
    return text + ' '.repeat(padding);
  }

  function render(node: MapNode, prefix: string, isLast: boolean) {
    const connector = isLast ? '└─' : '├─';

    // Handle repeat group placeholder
    if (node.repeatGroup) {
      const label = `[×${node.repeatGroup.count} ${node.repeatGroup.pattern}]`;
      const comps = node.c.length > 0 ? ` [${node.c.join(', ')}]` : '';
      const line = `${prefix}${connector} ${label}${comps}`;
      const comment = `# ${node.annotation.en} / ${node.annotation.zh}`;
      lines.push(padTo(line, ANNOTATION_COL) + comment);
      return;
    }

    const components = node.c.length > 0 ? ` [${node.c.join(', ')}]` : '';
    const keyMarker = node.k ? ' ★' : '';
    const uncertain = node.annotation.uncertain ? ' [?]' : '';
    const line = `${prefix}${connector} ${node.n}${components}${keyMarker}`;
    const comment = `# ${node.annotation.en} / ${node.annotation.zh}${uncertain}`;

    lines.push(padTo(line, ANNOTATION_COL) + comment);

    const newPrefix = prefix + (isLast ? '   ' : '│  ');

    // Render kept children
    for (let i = 0; i < node.children.length; i++) {
      const isChildLast = i === node.children.length - 1 && !node.collapsedCount;
      render(node.children[i], newPrefix, isChildLast);
    }

    // Render collapsed remainder
    if (node.collapsedCount) {
      const collapsedLine = `${newPrefix}└─ [... ${node.collapsedCount} ${node.collapsedLabel}]`;
      lines.push(collapsedLine);
    }
  }

  // Render root specially (no connector)
  const rootComps = root.c.length > 0 ? ` [${root.c.join(', ')}]` : '';
  const rootKey = root.k ? ' ★' : '';
  const rootLine = `${root.n}${rootComps}${rootKey}`;
  const rootComment = `# ${root.annotation.en} / ${root.annotation.zh}`;
  lines.push(padTo(rootLine, ANNOTATION_COL) + rootComment);

  for (let i = 0; i < root.children.length; i++) {
    const isLast = i === root.children.length - 1 && !root.collapsedCount;
    render(root.children[i], '', isLast);
  }

  if (root.collapsedCount) {
    lines.push(`└─ [... ${root.collapsedCount} ${root.collapsedLabel}]`);
  }

  return lines.join('\n');
}

/**
 * Generate the Quick Reference table rows for key nodes.
 */
function generateQuickReference(
  keyNodes: MapNode[],
  root: VNode
): string {
  const rows: string[] = [];

  rows.push('| Node | Path | Components | Purpose |');
  rows.push('|------|------|------------|---------|');

  for (const kn of keyNodes) {
    const path = getNodePath(root, kn.u) || `/${kn.n}`;
    const comps = kn.c.length > 0 ? kn.c.join(', ') : '-';
    const purpose = kn.annotation.zh;
    rows.push(`| ${kn.n} | ${path} | ${comps} | ${purpose} |`);
  }

  return rows.join('\n');
}

// ============================================================
// Diff Functions
// ============================================================

interface DiffResult {
  added: Array<{ uuid: string; name: string; path: string }>;
  removed: Array<{ uuid: string; name: string; path: string }>;
  modified: Array<{ uuid: string; name: string; changes: string[] }>;
}

function diffTrees(cached: VNode, current: VNode): DiffResult {
  const result: DiffResult = { added: [], removed: [], modified: [] };

  const cachedMap = new Map<string, VNode>();
  const currentMap = new Map<string, VNode>();

  function collectNodes(node: VNode, map: Map<string, VNode>) {
    map.set(node.u, node);
    for (const child of node._) {
      collectNodes(child, map);
    }
  }

  collectNodes(cached, cachedMap);
  collectNodes(current, currentMap);

  // Find removed
  for (const [uuid, node] of cachedMap) {
    if (!currentMap.has(uuid)) {
      result.removed.push({
        uuid,
        name: node.n,
        path: getNodePath(cached, uuid) || ''
      });
    }
  }

  // Find added
  for (const [uuid, node] of currentMap) {
    if (!cachedMap.has(uuid)) {
      result.added.push({
        uuid,
        name: node.n,
        path: getNodePath(current, uuid) || ''
      });
    }
  }

  // Find modified
  for (const [uuid, cachedNode] of cachedMap) {
    const currentNode = currentMap.get(uuid);
    if (currentNode) {
      const changes: string[] = [];

      if (cachedNode.n !== currentNode.n) {
        changes.push(`name: ${cachedNode.n} → ${currentNode.n}`);
      }

      const addedComps = currentNode.c.filter(c => !cachedNode.c.includes(c));
      const removedComps = cachedNode.c.filter(c => !currentNode.c.includes(c));

      if (addedComps.length > 0) {
        changes.push(`+components: ${addedComps.join(', ')}`);
      }
      if (removedComps.length > 0) {
        changes.push(`-components: ${removedComps.join(', ')}`);
      }

      if (changes.length > 0) {
        result.modified.push({ uuid, name: currentNode.n, changes });
      }
    }
  }

  return result;
}

// ============================================================
// Export
// ============================================================

export {
  VNode,
  VSceneIndex,
  Manifest,
  MapAnnotation,
  MapNode,
  MapResult,
  isKeyNode,
  isKeyComponent,
  buildIndex,
  renderTree,
  findByName,
  findByType,
  findNodeByUuid,
  getNodePath,
  checkFreshness,
  formatAge,
  diffTrees,
  inferAnnotation,
  filterForMap,
  renderMapTree,
  generateQuickReference,
  DiffResult,
  FreshnessLevel,
  RenderOptions,
};
