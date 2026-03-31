import { useEffect, useState } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Position,
  Handle,
  useNodesState,
  useEdgesState,
  MiniMap
} from 'reactflow';
import type { Node, Edge } from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { Layers, Wrench, Network, Search, Server, Database, Monitor, Cpu, Terminal, LayoutTemplate, Mic, Filter, X } from 'lucide-react';

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const isHorizontal = direction === 'LR';
  
  dagreGraph.setGraph({ 
    rankdir: direction,
    ranksep: 280, 
    nodesep: 24 
  });

  nodes.forEach((node) => dagreGraph.setNode(node.id, { width: 340, height: 128 }));
  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - 340 / 2,
        y: nodeWithPosition.y - 128 / 2,
      }
    };
  });

  return { nodes: layoutedNodes, edges };
};

const DOMAINS = [
  { id: 'agent', label: 'Agents & Commands', icon: <Layers size={14}/>, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'tool', label: 'Tools', icon: <Wrench size={14}/>, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'mcp', label: 'MCP Integration', icon: <Network size={14}/>, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'api', label: 'API & Network', icon: <Server size={14}/>, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'state', label: 'State & Memory', icon: <Database size={14}/>, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { id: 'ui', label: 'Terminal UI', icon: <Monitor size={14}/>, color: 'text-sky-600 bg-sky-50 border-sky-200' },
  { id: 'engine', label: 'Core Engine', icon: <Cpu size={14}/>, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'boot', label: 'Bootloader', icon: <Terminal size={14}/>, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { id: 'render', label: 'Ink Renderer', icon: <LayoutTemplate size={14}/>, color: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200' },
  { id: 'voice', label: 'Voice Module', icon: <Mic size={14}/>, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' }
];

const CustomNode = ({ data }: { data: any }) => {
  const g = data.group;
  const domain = DOMAINS.find(d => d.id === g) || DOMAINS[0];

  return (
    <div className="nodrag px-4 py-3 shadow-sm rounded-xl border border-gray-200 bg-white/95 backdrop-blur-md transition-all duration-200 hover:shadow-md cursor-pointer w-[340px] min-h-[128px] flex flex-col justify-between active:scale-[0.98]">
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-slate-400 border-none opacity-0" />
      
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`p-2 rounded-lg ${domain.color.split(' ').slice(0,2).join(' ')} shrink-0`}>
            {domain.icon}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold text-slate-900 truncate" title={data.label}>
              {data.label}
            </span>
            <span className="text-[10px] text-slate-400 truncate" title={data.path}>
              {data.path}
            </span>
          </div>
        </div>
        
        {data.extends && (
          <div className="shrink-0 px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[9px] font-mono text-slate-600 font-semibold uppercase tracking-wider">
            ↳ {data.extends}
          </div>
        )}
      </div>
      
      <div className="mt-2 text-xs text-slate-600 line-clamp-2 leading-snug w-full" title={data.description}>
        {data.description}
      </div>

      {data.exports && data.exports.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 w-full border-t border-slate-100 pt-2">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest shrink-0">API</span>
          <div className="flex flex-wrap gap-1 overflow-hidden h-4">
            {data.exports.map((exp: string, idx: number) => (
              <span key={idx} className="text-[10px] text-slate-500 font-mono bg-slate-50 px-1.5 rounded truncate max-w-[80px]">
                {exp}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-slate-400 border-none opacity-0" />
    </div>
  );
};

const nodeTypes = { customNode: CustomNode };

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [baseNodes, setBaseNodes] = useState<Node[]>([]);
  const [baseEdges, setBaseEdges] = useState<Edge[]>([]);
  
  const [activeDomains, setActiveDomains] = useState<Set<string>>(new Set(['agent', 'tool', 'engine']));
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch(`/graph.json?v=${new Date().getTime()}`)
      .then(res => res.json())
      .then((data) => {
        const mappedEdges = (data.edges || []).map((e: any) => ({
          ...e, type: 'smoothstep', animated: true,
        }));
        setBaseNodes(data.nodes || []);
        setBaseEdges(mappedEdges);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load graph data:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (baseNodes.length === 0) return;
    const visibleNodesByDomain = baseNodes.filter(n => activeDomains.has(n.data?.group));
    const visibleNodeIds = new Set(visibleNodesByDomain.map(n => n.id));
    const visibleEdges = baseEdges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
    const connectedNodeIds = new Set();
    
    visibleEdges.forEach(e => {
      connectedNodeIds.add(e.source);
      connectedNodeIds.add(e.target);
    });

    const strictlyVisibleNodes = visibleNodesByDomain.filter(n => connectedNodeIds.has(n.id));
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(strictlyVisibleNodes, visibleEdges);
    
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setSelectedNode(null); 
  }, [baseNodes, baseEdges, activeDomains, setNodes, setEdges]);

  useEffect(() => {
    const isSearching = searchQuery.trim().length > 0;
    const lowerQuery = searchQuery.toLowerCase();
    let activeNodes = new Set<string>();

    if (selectedNode) {
      activeNodes.add(selectedNode);
      edges.forEach(e => {
        if (e.source === selectedNode) activeNodes.add(e.target);
        if (e.target === selectedNode) activeNodes.add(e.source);
      });
    } else if (isSearching) {
      nodes.forEach(n => {
        const matchesLabel = n.data?.label?.toLowerCase().includes(lowerQuery);
        const matchesPath = n.data?.path?.toLowerCase().includes(lowerQuery);
        const matchesDesc = n.data?.description?.toLowerCase().includes(lowerQuery);
        
        if (matchesLabel || matchesPath || matchesDesc) {
          activeNodes.add(n.id);
        }
      });
    }

    const hasActiveState = selectedNode !== null || isSearching;

    setNodes(nds => nds.map(n => ({
      ...n,
      style: { opacity: !hasActiveState || activeNodes.has(n.id) ? 1 : 0.15, transition: 'opacity 0.2s' }
    })));

    setEdges(eds => eds.map(e => {
      let isEdgeActive = false;
      let isOutgoing = false;

      if (selectedNode) {
        isEdgeActive = e.source === selectedNode || e.target === selectedNode;
        isOutgoing = e.source === selectedNode; 
      } else if (isSearching) {
        isEdgeActive = activeNodes.has(e.source) && activeNodes.has(e.target);
      }

      const defaultStroke = '#CBD5E1'; 
      return {
        ...e,
        zIndex: isEdgeActive ? 10 : 0,
        style: {
          strokeWidth: isEdgeActive ? 2.5 : 1.5,
          opacity: !hasActiveState ? 0.6 : (isEdgeActive ? 1 : 0.05),
          stroke: !hasActiveState ? defaultStroke : (isEdgeActive ? (selectedNode && isOutgoing ? '#6366F1' : '#F43F5E') : defaultStroke),
          transition: 'all 0.2s'
        }
      };
    }));
  }, [selectedNode, searchQuery, setNodes, setEdges]);

  const toggleDomain = (domainId: string) => {
    setActiveDomains(prev => {
      const next = new Set(prev);
      if (next.has(domainId)) {
        next.delete(domainId);
      } else {
        next.add(domainId);
      }
      return next;
    });
  };

  const nodeColor = (node: Node) => {
    switch (node.data?.group) {
      case 'tool': return '#818CF8';
      case 'mcp': return '#34D399';
      case 'api': return '#FBBF24';
      case 'state': return '#FB7185';
      case 'ui': return '#38BDF8';
      case 'engine': return '#C084FC';
      case 'boot': return '#FB923C';
      case 'render': return '#E879F9';
      case 'voice': return '#22D3EE';
      default: return '#CBD5E1';
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-600">
          <Network className="animate-spin" size={24} />
          <span className="font-medium">Loading Architecture Graph...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-screen relative bg-slate-50 overflow-hidden">
      
      <nav className="absolute top-2 md:top-4 left-2 right-2 md:left-4 md:right-4 z-50 rounded-xl border border-gray-200 bg-white/90 backdrop-blur-xl shadow-sm p-3 flex flex-col md:flex-row gap-3 md:gap-0 md:items-center justify-between">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 text-white p-2 rounded-lg shrink-0">
              <Layers size={18} className="md:w-5 md:h-5" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900 text-sm md:text-base leading-tight">Agent Architecture Explorer</h1>
              <p className="text-xs text-slate-500 hidden md:block">Explanatory Analysis Mode</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden p-2 rounded-lg border transition-colors flex items-center justify-center ${
              isMobileMenuOpen 
                ? 'bg-slate-900 text-white border-slate-900' 
                : 'bg-white text-slate-600 border-gray-200 hover:bg-slate-50'
            }`}
          >
            {isMobileMenuOpen ? <X size={18} /> : <Filter size={18} />}
          </button>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="hidden md:block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full border border-slate-200 whitespace-nowrap">
            {nodes.length} Visible Nodes
          </div>
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search components..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64 pl-9 pr-4 py-2 bg-slate-100/80 border-transparent rounded-lg text-sm focus:bg-white focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-900 transition-all"
            />
          </div>
        </div>
      </nav>

      <div className={`absolute z-40 top-[115px] md:top-24 left-2 right-2 md:left-4 md:right-auto md:w-64 max-h-[60vh] md:max-h-[calc(100vh-120px)] overflow-y-auto bg-white/95 md:bg-white/90 backdrop-blur-xl border border-gray-200 rounded-xl shadow-2xl md:shadow-sm p-4 custom-scrollbar transition-all duration-300 origin-top ${
        isMobileMenuOpen 
          ? 'opacity-100 translate-y-0 visible' 
          : 'opacity-0 -translate-y-4 invisible md:opacity-100 md:translate-y-0 md:visible'
      }`}>
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
          <Filter size={16} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800 text-sm">Architectural Domains</h2>
        </div>
        <div className="flex flex-col gap-2">
          {DOMAINS.map(domain => {
            const isActive = activeDomains.has(domain.id);
            return (
              <button
                key={domain.id}
                onClick={() => toggleDomain(domain.id)}
                className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? `${domain.color} border` 
                    : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                }`}
              >
                {domain.icon}
                {domain.label}
              </button>
            );
          })}
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => setSelectedNode(node.id)}
        onPaneClick={() => {
          setSelectedNode(null);
          setIsMobileMenuOpen(false);
        }}
        fitView
        minZoom={0.05}
        nodesDraggable={false} 
        nodesConnectable={false}
      >
        <Background color="#E2E8F0" gap={24} size={2} />
        
        <Controls 
          position="bottom-left" 
          showInteractive={false}
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'absolute',
            bottom: '24px',
            left: '16px',
            margin: 0,
            zIndex: 50
          }}
          className="bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200 rounded-lg overflow-hidden fill-slate-700" 
        />
        
        <MiniMap 
          nodeColor={nodeColor}
          maskColor="rgba(248, 250, 252, 0.7)"
          className="hidden md:block rounded-xl border border-gray-200 shadow-sm overflow-hidden bg-white mb-4 mr-4"
        />
      </ReactFlow>
    </div>
  );
}