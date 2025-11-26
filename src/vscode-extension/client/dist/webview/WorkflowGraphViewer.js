"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowGraphViewer = WorkflowGraphViewer;
const react_1 = __importStar(require("react"));
const react_2 = require("@xyflow/react");
const dagre_1 = __importDefault(require("dagre"));
const DEFAULT_NODE_WIDTH = 250;
const DEFAULT_NODE_HEIGHT = 80;
function layoutGraph(nodes, edges) {
    if (nodes.length === 0)
        return [];
    const dagreGraph = new dagre_1.default.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 50 });
    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, {
            width: DEFAULT_NODE_WIDTH,
            height: DEFAULT_NODE_HEIGHT,
        });
    });
    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });
    dagre_1.default.layout(dagreGraph);
    return nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - DEFAULT_NODE_WIDTH / 2,
                y: nodeWithPosition.y - DEFAULT_NODE_HEIGHT / 2,
            },
        };
    });
}
function isParallelNode(nodeId, parallelGroups) {
    return parallelGroups.some((group) => group.taskIds.includes(nodeId));
}
function convertToReactFlow(graph) {
    const initialNodes = graph.nodes.map((node) => {
        const isParallel = isParallelNode(node.id, graph.parallelGroups);
        return {
            id: node.id,
            type: 'default',
            data: { label: node.label, isParallel },
            position: { x: 0, y: 0 },
            style: {
                background: isParallel ? '#e0f2fe' : '#ffffff',
                border: isParallel ? '2px solid #0284c7' : '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: isParallel ? '600' : '400',
            },
        };
    });
    const edges = graph.edges.map((edge, index) => ({
        id: `edge-${edge.source}-${edge.target}-${index}`,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: false,
        markerEnd: {
            type: react_2.MarkerType.ArrowClosed,
            width: 20,
            height: 20,
        },
        style: {
            strokeWidth: 2,
            stroke: '#9ca3af',
        },
    }));
    const layoutedNodes = layoutGraph(initialNodes, edges);
    return { nodes: layoutedNodes, edges };
}
function WorkflowGraphViewer() {
    const [graph, setGraph] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const { nodes, edges } = (0, react_1.useMemo)(() => {
        if (!graph || graph.nodes.length === 0) {
            return { nodes: [], edges: [] };
        }
        return convertToReactFlow(graph);
    }, [graph]);
    (0, react_1.useEffect)(() => {
        const vscode = acquireVsCodeApi();
        window.addEventListener('message', (event) => {
            const message = event.data;
            switch (message.type) {
                case 'updateGraph':
                    setGraph(message.graph);
                    setError(null);
                    break;
                case 'error':
                    setError(message.message);
                    break;
            }
        });
    }, []);
    if (error) {
        return (<div style={{ padding: '20px', color: '#dc2626', fontFamily: 'sans-serif' }}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>);
    }
    if (!graph || graph.nodes.length === 0) {
        return (<div style={{
                display: 'flex',
                height: '100vh',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'sans-serif',
                color: '#6b7280'
            }}>
        <div style={{ textAlign: 'center' }}>
          <svg style={{ margin: '0 auto', height: '48px', width: '48px', color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p style={{ marginTop: '8px', fontSize: '14px' }}>No tasks in this workflow</p>
        </div>
      </div>);
    }
    return (<div style={{ width: '100vw', height: '100vh' }}>
      <react_2.ReactFlow nodes={nodes} edges={edges} fitView minZoom={0.1} maxZoom={2} defaultViewport={{ x: 0, y: 0, zoom: 1 }} proOptions={{ hideAttribution: true }}>
        <react_2.Controls />
        <react_2.Background variant={react_2.BackgroundVariant.Dots} gap={12} size={1}/>
      </react_2.ReactFlow>
    </div>);
}
//# sourceMappingURL=WorkflowGraphViewer.js.map