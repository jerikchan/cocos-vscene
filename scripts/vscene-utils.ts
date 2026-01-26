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
  DiffResult,
  FreshnessLevel,
  RenderOptions,
};
