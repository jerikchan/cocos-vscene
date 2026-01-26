# MCP Integration Reference

How VScene interacts with Cocos Creator MCP service.

## MCP Dependency

VScene requires Cocos Creator MCP service for:
- `pull` - Fetch scene hierarchy
- `detail` - Query node/component properties
- `diff` - Compare with real scene

Offline operations (no MCP needed):
- `read` - Read from cached index
- `find` - Search in cached index
- `status` - Show cache status

---

## MCP Connection Check

Before any MCP operation, verify connection:

```typescript
// Check MCP availability
async function checkMcpConnection(): Promise<boolean> {
  try {
    // Try lightweight API call
    await mcp__cocos-creator__scene_manage({
      operation: "get-properties"
    });
    return true;
  } catch (error) {
    return false;
  }
}
```

### Connection Failed Response

```markdown
## ⚠️ Cocos Creator MCP not connected

Cannot perform this operation because MCP service is unavailable.

### Possible causes
1. Cocos Creator editor not running
2. MCP extension not installed/enabled
3. MCP server not configured in Claude

### Solutions
1. Start Cocos Creator and open project
2. Check `extensions/cocos-mcp/` exists
3. Verify MCP server configuration

### Available offline commands
- `vscene read` - Read cached index
- `vscene find` - Search in cache
- `vscene status` - View cache status
```

---

## MCP API Usage

### 1. Pull Scene Hierarchy

**API:** `node_query`

```typescript
// Fetch full scene tree
const result = await mcp__cocos-creator__node_query({
  maxDepth: 10,
  includeComponents: true,
  includeComponentProperties: false  // Don't fetch properties
});
```

**Response processing:**
```typescript
function convertToVNode(mcpNode: any, depth: number): VNode {
  const components = (mcpNode.components || [])
    .map(c => c.type)
    .filter(type => !type.startsWith('cc.'));  // Filter engine components

  return {
    u: mcpNode.uuid,
    n: mcpNode.name,
    c: components,
    k: isKeyNode(components),
    d: depth,
    _: (mcpNode.children || []).map(child =>
      convertToVNode(child, depth + 1)
    )
  };
}

function isKeyNode(components: string[]): boolean {
  const keyPatterns = [
    /Manager$/i, /Controller$/i, /System$/i,
    /Assets$/i, /Factory$/i, /Spawner$/i,
    /Trigger$/i, /Handler$/i, /Root$/i
  ];

  return components.some(c =>
    keyPatterns.some(p => p.test(c)) || !c.startsWith('cc.')
  );
}
```

### 2. Query Node Details

**API:** `node_query` + `component_query`

```typescript
// Step 1: Get node with components
const nodeResult = await mcp__cocos-creator__node_query({
  nodeUuid: targetUuid,
  maxDepth: 0,
  includeComponents: true,
  includeComponentProperties: true
});

// Step 2: Get detailed component properties
const componentUuids = nodeResult.components
  .filter(c => !c.type.startsWith('cc.'))
  .map(c => c.uuid);

const componentDetails = await mcp__cocos-creator__component_query({
  componentUuids: componentUuids,
  includeTooltips: false,
  hideInternalProps: true
});
```

### 3. Compare Scene (Diff)

```typescript
async function diffScene(cachedIndex: VSceneIndex): Promise<DiffResult> {
  // Fetch current scene
  const currentScene = await mcp__cocos-creator__node_query({
    maxDepth: 10,
    includeComponents: true,
    includeComponentProperties: false
  });

  // Convert to comparable format
  const currentIndex = buildIndex(currentScene);

  // Compare
  return compareIndices(cachedIndex, currentIndex);
}

function compareIndices(cached: Index, current: Index): DiffResult {
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  // Check for removed nodes
  for (const uuid of Object.keys(cached.byUuid)) {
    if (!current.byUuid[uuid]) {
      removed.push(uuid);
    }
  }

  // Check for added nodes
  for (const uuid of Object.keys(current.byUuid)) {
    if (!cached.byUuid[uuid]) {
      added.push(uuid);
    }
  }

  // Check for modified nodes
  for (const uuid of Object.keys(cached.byUuid)) {
    if (current.byUuid[uuid]) {
      const cachedNode = cached.byUuid[uuid];
      const currentNode = current.byUuid[uuid];

      if (hasChanges(cachedNode, currentNode)) {
        modified.push(uuid);
      }
    }
  }

  return { added, removed, modified };
}
```

---

## Error Handling

### MCP Timeout

```typescript
const MCP_TIMEOUT = 30000; // 30 seconds

async function mcpWithTimeout<T>(operation: Promise<T>): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('MCP timeout')), MCP_TIMEOUT)
  );

  return Promise.race([operation, timeout]);
}
```

### Scene Not Open

```markdown
❌ No scene is currently open in Cocos Creator.

Please open a scene first, then run `vscene pull`.
```

### Large Scene Warning

```typescript
const NODE_COUNT_WARNING = 2000;

if (nodeCount > NODE_COUNT_WARNING) {
  console.warn(`⚠️ Large scene detected (${nodeCount} nodes)`);
  console.warn('Pull may take longer. Index will be ~${nodeCount * 50 / 1024}KB');
}
```

---

## Performance Considerations

### Batch Queries

For `detail` with multiple nodes, batch component queries:

```typescript
// Bad: Individual queries
for (const uuid of uuids) {
  await mcp__cocos-creator__component_query({ componentUuids: [uuid] });
}

// Good: Batch query
await mcp__cocos-creator__component_query({ componentUuids: uuids });
```

### Depth Limiting

Never fetch full depth for large scenes:

```typescript
// For initial pull: use maxDepth 10 (reasonable limit)
// For detail: use maxDepth 0 (single node)
// For subtree: use maxDepth 3 (controlled expansion)
```

### Property Filtering

Only fetch properties when needed:

```typescript
// For index building: no properties
{ includeComponentProperties: false }

// For detail view: with properties
{ includeComponentProperties: true }
```
