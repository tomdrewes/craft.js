# CraftJS Architecture Research

## Overview

CraftJS is a React-based page editor framework organized as a Yarn Workspaces monorepo. It provides the infrastructure for building drag-and-drop page builders, giving developers full control over the editor UI while handling the complex state, event, and rendering logic internally.

**Current version**: 0.3.3
**Stack**: TypeScript, React, Immer, Rollup, Lerna, Jest

---

## Repository Structure

```
craft.js/
├── packages/
│   ├── core/          # Main editor framework (~4,000 LOC)
│   ├── utils/         # Shared state management primitives
│   └── layers/        # Optional Photoshop-style layers panel UI
├── examples/          # Demo applications
├── site/              # Documentation website
├── cypress/           # End-to-end tests
├── jest/              # Jest configuration
└── scripts/           # Build and deployment automation
```

---

## Package Organization

### `@craftjs/core` (v0.3.3)

The primary package. Contains the editor framework, state management, drag-and-drop system, node rendering pipeline, event system, and serialization/deserialization.

**Dependencies**: immer, lodash, debounce, tiny-invariant, @craftjs/utils

### `@craftjs/utils` (v0.3.1)

Shared primitives used by core and layers. Contains the `useMethods` hook (Immer-based state management), undo/redo history, the event handler framework, DOM utilities, and shared types.

**Dependencies**: immer, lodash, nanoid, shallowequal

### `@craftjs/layers` (v0.3.0)

Optional UI package providing a Photoshop-style layers panel that visualizes the node hierarchy. Built with styled-components. Not required for core editor functionality.

**Dependencies**: @craftjs/core, styled-components

---

## Core Architecture

### 1. Node System

Every editable element in CraftJS is represented as a **Node** — a plain data object stored in a flat, normalized map keyed by `NodeId`.

```typescript
type Node = {
  id: NodeId;
  data: {
    type: string | React.ElementType;  // Component reference
    name: string;                      // Resolved component name
    displayName: string;               // Human-readable name
    props: Record<string, any>;        // Component props
    parent: NodeId | null;
    isCanvas: boolean;                 // Whether this node can contain children
    hidden: boolean;
    nodes: NodeId[];                   // Ordered child node IDs
    linkedNodes: Record<string, NodeId>; // Named special children
    custom?: any;                      // Arbitrary metadata
  };
  related: Record<string, React.ElementType>; // Related UI components (e.g., settings panel)
  events: Record<NodeEventTypes, boolean>;    // selected, hovered, dragged states
  rules: NodeRules;                           // canDrag, canDrop, canMoveIn, canMoveOut
  dom: HTMLElement | null;                    // Mounted DOM element reference
  _hydrationTimestamp: number;               // Forces re-render on data changes
};
```

**Node types**:

- **Root node** (`id='ROOT'`): The single top-level canvas.
- **Canvas nodes** (`isCanvas: true`): Can contain children; act as drop targets.
- **Regular nodes**: Leaf or branch elements that cannot accept drops.
- **Linked nodes**: Special nodes owned by a parent component, referenced by name in `linkedNodes`.

**Node creation pipeline**:
1. `parseNodeFromJSX()` converts React JSX into a call to `createNode()`
2. `createNode()` generates a Node with defaults and applies the component's `craft` config property
3. Nodes are linked to parents via `addNodeTree()` or `addLinkedNodeFromTree()`

User components declare their editor configuration via a static `craft` property:

```typescript
type UserComponentConfig<T> = {
  displayName?: string;
  rules?: Partial<NodeRules>;    // canDrag, canDrop, canMoveIn, canMoveOut
  related?: Record<string, React.ElementType>;
  props?: Partial<T>;            // Default props
  custom?: Record<string, any>;
  isCanvas?: boolean;
};
```

---

### 2. Editor State

The top-level editor state is a single normalized object:

```typescript
type EditorState = {
  nodes: Record<NodeId, Node>;
  events: {
    selected: Set<NodeId>;
    hovered: Set<NodeId>;
    dragged: Set<NodeId>;
  };
  options: Options;             // Editor configuration (resolver, handlers, etc.)
  indicator: Indicator | null; // Current drop position indicator
};
```

State is managed by the `store` (`packages/core/src/editor/store.tsx`), which wraps `useMethods` from `@craftjs/utils`. All mutations go through **actions** (Immer draft mutations), and all reads go through **queries** (pure functions over state).

---

### 3. State Management (`@craftjs/utils`)

**Core hook**: `useMethods` — an Immer-based state container that:
- Applies mutations via `immer.produce` draft functions
- Generates Immer patches and inverse patches on each mutation
- Feeds patches into a History timeline for undo/redo
- Notifies subscribers after each state update

**State flow**:
```
Action call → Immer draft mutation → Patches generated → History updated → Subscribers notified
```

**History system** (`packages/utils/src/History.ts`):
- Timeline: array of `{ patches, inversePatches, timestamp }` entries
- Pointer-based undo/redo navigation
- **Throttle mode**: Combines rapid successive mutations into one history entry
- **Merge mode**: Combines with the most recent history entry
- Certain actions are excluded from history: `setDOM`, `setNodeEvent`, `selectNode`, `clearEvents`, `setOptions`, `setIndicator`

---

### 4. Actions API

Actions are state mutation methods exposed via `useEditor` and `useNode`. They mutate the Immer draft directly.

**Editor-level actions** (`packages/core/src/editor/actions.ts`):

| Method | Description |
|---|---|
| `add(node, parentId, index)` | Add a node to a parent at a given position |
| `addNodeTree(tree, parentId, index)` | Add multiple nodes (with full subtrees) |
| `addLinkedNodeFromTree(tree, parentId, id)` | Add a linked node |
| `delete(selector)` | Remove a node and all its descendants |
| `move(selector, newParentId, index)` | Move a node to a new parent |
| `deserialize(json)` | Load state from serialized JSON |
| `replaceNodes(nodes)` | Replace entire node map |
| `reset()` | Clear all state |
| `clearEvents()` | Clear selection, hover, and drag states |
| `setOptions(cb)` | Update editor configuration options |
| `setNodeEvent(type, selector)` | Set selected/hovered/dragged state |
| `setCustom(selector, cb)` | Update `node.custom` metadata |
| `setDOM(id, dom)` | Store the mounted DOM element reference |
| `setProp(id, cb)` | Update `node.data.props` |
| `setHidden(id, bool)` | Toggle node visibility |
| `setIndicator(indicator)` | Update drop position indicator |

---

### 5. Query API

Queries are pure read functions over editor state, exposed via `useEditor` and `useNode`.

**Editor-level queries** (`packages/core/src/editor/query.tsx`):

| Method | Description |
|---|---|
| `node(id)` | Get `NodeHelpers` for a specific node |
| `getNodes()` | Get the full nodes map |
| `getOptions()` | Get editor configuration |
| `getEvent(type)` | Get `EventHelpers` for selected/hovered/dragged |
| `serialize()` | Export full state to JSON |
| `getSerializedNodes()` | Get all nodes in serialized format |
| `parseReactElement(jsx)` | Create a `NodeTree` from a React element |
| `parseSerializedNode(data)` | Restore a `Node` from serialized data |
| `parseFreshNode(node)` | Create a `Node` from partial data |
| `getDropPlaceholder(source, target, pos)` | Calculate a drop position |

**Node helpers** (`NodeHelpers`):
- `isCanvas()`, `isRoot()`, `isLinkedNode()`, `isTopLevelNode()`
- `ancestors(deep)`, `descendants(deep)`, `childNodes()`, `linkedNodes()`
- `isDraggable(onError)`, `isDroppable(source, onError)`
- `toSerializedNode()`
- `isSelected()`, `isHovered()`, `isDragged()`

---

### 6. Rendering Pipeline

**Components**:
- `<Editor>` — root context provider; initializes state and options
- `<Frame>` — defines the editable area; initializes nodes from JSX or serialized JSON
- `<Element>` — declares an editable element within the frame
- `<Canvas>` — deprecated; use `<Element canvas={true}>` instead

**Rendering flow**:
1. `Frame` initializes the root node and sets up the node tree
2. `NodeElement` wraps each node in its `NodeContext` provider
3. `RenderNode` applies the optional custom `render` callback from options
4. `DefaultRender` creates the React element from node data
5. `SimpleElement` attaches required event handlers to the DOM element

The `_hydrationTimestamp` field on each node is used as a `useMemo`/`React.memo` dependency to force re-renders when node data changes, preventing stale closures in render functions.

---

### 7. Event System

**Abstract base** (`CoreEventHandlers` in `packages/utils/src/EventHandlers/`):
- Defines the connector interface for attaching DOM event listeners
- `ConnectorRegistry` tracks registered DOM elements
- `CraftDOMEvent` wraps native events with a custom `stopPropagation` that prevents other Craft handlers from firing (distinct from native DOM propagation)

**Default event handlers** (`DefaultEventHandlers.ts`):

| Handler | Behavior |
|---|---|
| `connect` | Register the element with the editor; attach all event listeners |
| `select` | Click to select a node (multiselect with metaKey) |
| `hover` | Mouseover to update hover state |
| `drag` | Initiate drag operation on mousedown |
| `drop` | Validate and handle drop target on dragover/drop |
| `create` | Add a new component to a canvas via drag from palette |

Events are blocked from propagating to ancestor nodes using `isEventBlockedByDescendant()` checks tracked in a `blockedEvents` map.

---

### 8. Drag and Drop

**Drag initiation**:
1. `DefaultEventHandlers.drag()` attaches listeners to draggable nodes
2. `createShadow()` builds a visual drag preview element

**During drag**:
3. `Positioner` (`packages/core/src/events/Positioner.ts`) tracks the current drop target and computes the drop indicator position
4. `findPosition()` calculates insertion point relative to siblings
5. `RenderEditorIndicator` renders the visual drop line indicator
6. Scroll events trigger position recalculation

**Drop**:
7. Validation runs: `canDrag`, `canDrop`, `canMoveIn`, `canMoveOut`
8. On success: `actions.move()` (existing node) or `actions.add()` (new component)

**Drag target types**:
- **Existing**: Moving a node already in the editor
- **New**: Dropping a fresh component from a palette

---

### 9. Resolver System

The resolver maps component names to their implementations, enabling serialization and deserialization.

```typescript
const resolver = {
  Button: MyButton,
  Text: MyText,
  Card: MyCard,
};
```

**Implementation** (`packages/core/src/utils/resolveComponent.ts`):
- Maintains a reversed map (component → name) cached in `CACHED_RESOLVER_DATA`
- Cache is invalidated when the resolver reference changes
- `serializeNode`: converts `type` (component reference) → `{ resolvedName: string }`
- `deserializeNode`: converts `{ resolvedName: string }` → component via resolver lookup
- HTML string types pass through unchanged

---

### 10. Serialization / Deserialization

**Serialization** (`serializeNode.tsx`):
1. Filter props: remove `undefined`, `null`, and functions
2. Convert component type → `{ resolvedName: string }` (HTML strings stay as-is)
3. Recursively process nested components embedded in `children` prop
4. Output a flat `SerializedNode` structure

**Deserialization** (`deserializeNode.tsx`):
1. Convert `{ resolvedName: string }` → component via resolver
2. Validate all referenced components exist in the resolver
3. Recursively deserialize nested children
4. Return `NodeData`; normalize via `createNode()`

**Serialized JSON format**:
```json
{
  "ROOT": {
    "type": "div",
    "isCanvas": true,
    "props": { "className": "container" },
    "nodes": ["node-1", "node-2"],
    "linkedNodes": {}
  },
  "node-1": {
    "type": { "resolvedName": "Button" },
    "props": { "label": "Click me" },
    "nodes": [],
    "linkedNodes": {},
    "parent": "ROOT"
  }
}
```

---

### 11. Public API

**Hooks**:

`useEditor<S>(collector?)` — access editor-wide state and actions
- Returns: `{ actions, query, connectors, store, ...collected }`
- `collector` is a selector function that subscribes to specific state slices
- Only re-renders when the collected value changes (shallow equality)

`useNode<S, P>(collector?)` — access node-scoped state and actions from within a user component
- Returns: `{ id, actions, connectors, related, ...collected }`
- Node-scoped actions: `setProp`, `setCustom`, `setHidden`

Both hooks use a **collector pattern**: pass a selector function to subscribe to only the state you need, avoiding unnecessary re-renders.

**Connectors** (returned from both hooks):
- `connectors.connect(el)` — register the element with the editor
- `connectors.drag(el)` — make the element draggable
- `connectors.select(el)` — make the element selectable
- `connectors.hover(el)` — make the element hoverable
- `connectors.create(el, component)` — register as a palette item for creating new nodes

Connectors are chainable and lazily register with the DOM; they clean up on unmount.

---

### 12. Build System

**Tool**: Rollup 2.79.0

**Outputs per package**:
- ESM: `dist/esm/index.js`
- CJS: `dist/cjs/index.js`
- Source maps for both formats

**Plugins**: TypeScript, Babel (preset-env + class properties), Terser (production), node-resolve

**Monorepo orchestration**: Lerna 7.3.0 via `yarn build` / `yarn dev` (watch mode with nodemon)

**TypeScript**: Strict mode, ES2015+ target, separate `tsconfig.jest.json` for test compilation

---

### 13. Testing

**Framework**: Jest with ts-jest, jsdom environment

**Test utilities** (`packages/core/src/utils/testHelpers.ts`):
- `createTestState()` — generate mock `EditorState`
- `createTestNodes()` — create collections of test nodes
- `createTestNode()` — single node factory
- `expectEditorState()` — assertion helpers

**Coverage areas**:
- Editor: actions, query methods, state normalization
- Nodes: creation, tree operations, linked nodes
- Utils: serialization, parsing, node queries
- Events: handler logic, drop positioning
- Render: Frame, RenderNode components
- Integration: full editor workflows

**E2E**: Cypress (`cypress/`) for browser-level integration tests

---

## Key Design Decisions

**Flat normalized state**: All nodes stored in a single `Record<NodeId, Node>` map. Relationships expressed as ID references. Enables O(1) lookups and avoids deep nesting problems.

**Immer for mutations**: All state changes use Immer draft mutations, providing structural sharing, patch generation (for history), and a familiar mutable syntax with immutable semantics.

**Patch-based undo/redo**: Immer patches eliminate the need to snapshot full state for each history entry. Only diffs are stored, making history memory-efficient.

**Collector pattern for subscriptions**: Hooks accept a selector function; components only re-render when their selected slice changes. This prevents unnecessary renders across a large editor.

**Hydration timestamps**: `_hydrationTimestamp` on each node acts as a version counter used in `useMemo` and `React.memo` dependencies, enabling targeted re-renders without deeply comparing props.

**Resolver decoupling**: The resolver pattern decouples component identity (name string) from implementation (React component), enabling serialization without bundling component code into the JSON.

**Extensible event handlers**: The abstract `CoreEventHandlers` base class allows consumers to replace or extend the default drag/drop/select behavior by providing a custom `handlers` option to `<Editor>`.

**Linked nodes**: The `linkedNodes` concept allows components to own named child slots that are separate from the standard `nodes` children array, enabling complex component structures like cards with separate header/body/footer slots.

---

## Known Limitations and Technical Debt

- `state.events` (editor-level `Set<NodeId>`) and `node.events` (per-node boolean flags) are maintained in parallel and must be kept in sync manually. A TODO in the source notes that proxies could automate this.
- The `Canvas` component is deprecated; `<Element canvas={true}>` is the current API, but `Canvas` is kept for backwards compatibility.
- `createNode()` has overloaded signatures that are not fully typed in TypeScript.
- The `DEPRECATED_ROOT_NODE` constant exists for compatibility with older serialized state formats.
- Prop filtering during serialization removes functions, which means event handlers cannot survive serialization/deserialization by design.
