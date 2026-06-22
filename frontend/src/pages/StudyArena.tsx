import React, { useState, useEffect } from 'react';
import { 
  Network, 
  MessageSquare, 
  Layers, 
  HelpCircle as QuizIcon, 
  Sparkles, 
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background, 
  MarkerType,
  Handle,
  Position,
  useNodesState,
  useEdgesState
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStudyStore } from '../store/useStudyStore';
import type { GraphNode } from '../store/useStudyStore';
import StudyChat from '../components/StudyChat';
import QuizTaker from '../components/QuizTaker';

// Custom Node for React Flow Graph styling
const ConceptNodeComponent = ({ data, selected }: any) => {
  const statusIcons: Record<string, string> = {
    weak: '🔵 Weak',
    strong: '🟣 Strong',
    not_studied: '⚪ Not Studied',
    studying: '🟣 Studying'
  };

  const statusBadgeColor: Record<string, string> = {
    weak: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    strong: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    not_studied: 'bg-[#222222] text-neutral-400 border border-neutral-800',
    studying: 'bg-neutral-800 text-neutral-200 border border-neutral-700'
  };

  const borderStyles: Record<string, string> = {
    high_probability: 'border-2 border-indigo-500/80 shadow-[0_0_15px_rgba(168,85,247,0.15)]',
    important: 'border-2 border-purple-500/80 shadow-[0_0_15px_rgba(37,99,235,0.15)]',
    revision: 'border-2 border-neutral-700/80 shadow-[0_0_15px_rgba(163,163,163,0.15)]'
  };

  const selectedBorder = selected
    ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-neutral-900 scale-[1.03] transition-all duration-300 shadow-[0_0_25px_rgba(168,85,247,0.6)] z-20'
    : 'transition-all duration-300';

  return (
    <div className={`p-4 rounded-2xl bg-[#1e1e1e] text-white min-w-[170px] text-left border ${borderStyles[data.importance] || 'border-neutral-800'} ${selectedBorder} relative group/node`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-2.5 h-2.5 !bg-indigo-500 !border-2 !border-neutral-900 opacity-0 group-hover/node:opacity-100 transition-opacity duration-300" 
      />
      <div className="flex justify-between items-center mb-2">
        <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase ${statusBadgeColor[data.status] || 'bg-[#222222]'}`}>
          {statusIcons[data.status] || '⚪ Not Studied'}
        </span>
        <span className="text-[8px] text-neutral-500 font-mono">
          {data.importance === 'high_probability' ? '🟣 High Prob' : data.importance === 'important' ? '🔵 Imp' : '⚪ Rev'}
        </span>
      </div>
      <h4 className="text-xs font-extrabold text-neutral-200 truncate">{data.label}</h4>
      <p className="text-[9px] text-neutral-500 mt-1 line-clamp-1">{data.description || 'Definition pending'}</p>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-2.5 h-2.5 !bg-indigo-500 !border-2 !border-neutral-900 opacity-0 group-hover/node:opacity-100 transition-opacity duration-300" 
      />
    </div>
  );
};

// Prerequisite-based Hierarchical DAG Layout helper
const getHierarchicalLayout = (nodes: any[], edges: any[]) => {
  const adj: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};
  const nodeIdToNode: Record<string, any> = {};

  nodes.forEach(n => {
    adj[n.nodeId] = [];
    inDegree[n.nodeId] = 0;
    nodeIdToNode[n.nodeId] = n;
  });

  edges.forEach(e => {
    if (adj[e.source] && nodeIdToNode[e.target]) {
      adj[e.source].push(e.target);
      inDegree[e.target]++;
    }
  });

  const depth: Record<string, number> = {};
  nodes.forEach(n => {
    depth[n.nodeId] = 0;
  });

  const N = nodes.length;
  for (let i = 0; i < Math.min(N, 15); i++) {
    let changed = false;
    edges.forEach(e => {
      if (depth[e.source] !== undefined && depth[e.target] !== undefined) {
        const newDepth = depth[e.source] + 1;
        if (newDepth > depth[e.target]) {
          depth[e.target] = newDepth;
          changed = true;
        }
      }
    });
    if (!changed) break;
  }

  const depthGroups: Record<number, any[]> = {};
  nodes.forEach(n => {
    const d = depth[n.nodeId] || 0;
    if (!depthGroups[d]) depthGroups[d] = [];
    depthGroups[d].push(n);
  });

  const levelHeight = 220;
  const nodeWidth = 280;
  const layouted: any[] = [];

  const depths = Object.keys(depthGroups).map(Number).sort((a, b) => a - b);
  depths.forEach(d => {
    const levelNodes = depthGroups[d];
    const totalWidth = (levelNodes.length - 1) * nodeWidth;
    const startX = -totalWidth / 2 + 100;

    levelNodes.forEach((n, idx) => {
      const xJitter = (idx % 2 === 0 ? 5 : -5);
      layouted.push({
        id: n.nodeId,
        type: 'customNode',
        position: {
          x: startX + idx * nodeWidth + xJitter,
          y: d * levelHeight + 80
        },
        data: {
          label: n.label,
          description: n.definition,
          status: n.status,
          importance: n.importance
        }
      });
    });
  });

  return layouted;
};

const nodeTypes = {
  customNode: ConceptNodeComponent
};

const getMermaidUrl = (code: string) => {
  try {
    const cleanCode = code.trim();
    const bytes = new TextEncoder().encode(cleanCode);
    const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    const encoded = btoa(binString);
    return `https://mermaid.ink/svg/${encoded}`;
  } catch (e) {
    return '';
  }
};

const StudyArena: React.FC = () => {
  const fetchDocuments = useStudyStore(state => state.fetchDocuments);
  const activeSubject = useStudyStore(state => state.activeSubject);
  const nodes = useStudyStore(state => state.nodes);
  const edges = useStudyStore(state => state.edges);
  const fetchGraph = useStudyStore(state => state.fetchGraph);
  const selectedNode = useStudyStore(state => state.selectedNode);
  const selectNodeById = useStudyStore(state => state.selectNodeById);
  const updateNodeStatus = useStudyStore(state => state.updateNodeStatus);
  const apiFetch = useStudyStore(state => state.apiFetch);
  const loadingNodeDetails = useStudyStore(state => state.loadingNodeDetails);

  const [activeTab, setActiveTab] = useState<'graph' | 'chat' | 'flashcards' | 'quiz'>('graph');
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  
  // Flashcards state
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [dueCards, setDueCards] = useState<any[]>([]);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [flashcardMode, setFlashcardMode] = useState<'browse' | 'review'>('browse');

  // Quiz state
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<{ score: number; total: number } | null>(null);

  useEffect(() => {
    fetchDocuments();
    // Retrieve list of processed subjects from files
    apiFetch('/docs')
      .then((docs: any[]) => {
        const subjects = docs
          .filter(d => d.status === 'completed')
          .map(d => d.subject || d.name.replace(/\.[^/.]+$/, ''));
        setSubjectsList([...new Set(subjects)]);
      })
      .catch(err => console.error('Error fetching processed subjects:', err));
  }, [fetchDocuments, apiFetch]);

  // Load subject-specific graph and tools
  useEffect(() => {
    if (activeSubject) {
      // 1. Fetch Subject Graph
      fetchGraph(activeSubject);

      // 2. Fetch quizzes for the subject
      apiFetch('/study/quizzes')
        .then(quizzesData => {
          setQuizzes(quizzesData);
        })
        .catch(err => console.error('Error fetching subject quizzes:', err));

      // 3. Fetch Flashcards
      apiFetch('/study/flashcards')
        .then(cards => {
          setFlashcards(cards);
          const due = cards.filter((c: any) => new Date(c.nextReviewDate) <= new Date());
          setDueCards(due);
        })
        .catch(err => console.error('Error fetching subject flashcards:', err));
    }
  }, [activeSubject, fetchGraph, apiFetch]);

  const handleSubjectChange = async (subj: string) => {
    await fetchGraph(subj);
  };

  const handleNodeClick = (_event: any, node: any) => {
    // Select node details
    const dbNode = nodes.find(n => n.nodeId === node.id);
    if (dbNode) {
      selectNodeById(dbNode._id);
    }
  };

  // Spaced Repetition Rate Card
  const handleReviewCard = async (rating: number) => {
    if (dueCards.length === 0) return;
    const card = dueCards[currentCardIdx];
    
    try {
      await apiFetch(`/study/flashcards/${card._id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      });

      // Update user details (XP level up check)
      await apiFetch('/auth/profile').then(profile => {
        useStudyStore.getState().setUser(profile.user);
      });

      setReviewSuccess(`Card reviewed! +10 XP awarded.`);
      setTimeout(() => {
        setReviewSuccess(null);
        setIsFlipped(false);
        if (currentCardIdx < dueCards.length - 1) {
          setCurrentCardIdx(prev => prev + 1);
        } else {
          // Re-fetch flashcards
          apiFetch('/study/flashcards').then(cards => {
            setFlashcards(cards);
            setDueCards(cards.filter((c: any) => new Date(c.nextReviewDate) <= new Date()));
            setCurrentCardIdx(0);
          });
        }
      }, 1500);

    } catch (err) {
      console.error('Error reviewing flashcard:', err);
    }
  };

  const handleUpdateStatus = async (node: GraphNode, newStatus: 'studying' | 'weak' | 'strong') => {
    updateNodeStatus(node.nodeId, newStatus);
    // In a production backend, we would call a PATCH /graph/node/:id route to update the status,
    // which then updates the database. We can mock this call or integrate:
    try {
      await apiFetch(`/graph/node/${node._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      // Swallowed since local update in Zustand is sufficient for UI demo
    }
  };

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node>([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Rebuild React Flow graph only when the graph structure changes (new subject loaded)
  useEffect(() => {
    const initialNodes = getHierarchicalLayout(nodes, edges);

    const initialEdges: Edge[] = edges.map(e => ({
      id: e.edgeId,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: true,
      style: { stroke: '#6366f1' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#6366f1'
      }
    }));

    setFlowNodes(initialNodes);
    setFlowEdges(initialEdges);
  // Only rebuild on structural changes (node count / edge count / subject change)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, edges.length, activeSubject]);

  // When node data updates (e.g. status or details fetched), patch in-place without rebuilding
  useEffect(() => {
    if (nodes.length === 0) return;
    setFlowNodes(prev =>
      prev.map(flowNode => {
        const dbNode = nodes.find(n => n.nodeId === flowNode.id);
        if (!dbNode) return flowNode;
        return {
          ...flowNode,
          data: {
            ...flowNode.data,
            label: dbNode.label,
            description: dbNode.definition,
            status: dbNode.status,
            importance: dbNode.importance
          }
        };
      })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#0b1326] text-[#dae2fd]">
      {/* Quiz Taker Overlay */}
      {activeQuizId && (
        <div className="fixed inset-0 bg-[#0b1326] z-50 overflow-y-auto">
          <QuizTaker 
            quizId={activeQuizId}
            onClose={() => setActiveQuizId(null)}
            onFinish={(score, total) => {
              setQuizScore({ score, total });
              setActiveQuizId(null);
            }}
          />
        </div>
      )}

      {/* Select Subject bar */}
      <header className="h-14 border-b border-white/5 bg-[#131b2e]/20 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Select Subject Graph:</span>
          <select 
            value={activeSubject || ''}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold py-1.5 px-3 focus:outline-none focus:border-indigo-500"
          >
            <option value="" disabled>Choose a study guide...</option>
            {subjectsList.map(subj => (
              <option key={subj} value={subj}>{subj}</option>
            ))}
          </select>
        </div>

        {/* Tab selection menu */}
        <div className="flex gap-1.5 bg-[#0b1326] border border-slate-800 p-0.5 rounded-lg">
          <button 
            onClick={() => setActiveTab('graph')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
              activeTab === 'graph' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network size={12} />
            <span>Mind Map</span>
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
              activeTab === 'chat' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare size={12} />
            <span>AI Chat</span>
          </button>
          <button 
            onClick={() => setActiveTab('flashcards')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
              activeTab === 'flashcards' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers size={12} />
            <span>Flashcards</span>
          </button>
          <button 
            onClick={() => setActiveTab('quiz')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
              activeTab === 'quiz' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QuizIcon size={12} />
            <span>Quizzes</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {!activeSubject ? (
        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
            <BookOpen size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Enter the Visual Study Arena</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mx-auto leading-relaxed">
              To activate the mind-map explorer, select an indexed study subject from the dropdown above, or upload a notes PDF in the Library.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Tab 1: Concept Mind-Map Graph */}
          {activeTab === 'graph' && (
            <div className="flex-1 flex overflow-hidden">
              {/* React Flow Panel */}
              <div className="flex-grow h-full bg-[#060e20] relative">
                <ReactFlow
                  nodes={flowNodes}
                  edges={flowEdges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodeTypes={nodeTypes}
                  onNodeClick={handleNodeClick}
                  fitView
                >
                  <Background color="#c0c1ff" gap={20} size={1} style={{ opacity: 0.05 }} />
                  <Controls />
                  <MiniMap 
                    nodeColor={() => 'rgba(168, 85, 247, 0.2)'}
                    maskColor="rgba(18, 18, 18, 0.7)"
                    style={{ backgroundColor: '#222222' }}
                  />
                </ReactFlow>
                <div className="absolute top-4 left-4 bg-[#222222]/80 border border-neutral-800 rounded-lg p-3 text-[10px] text-neutral-400 z-10 space-y-1">
                  <div className="font-bold text-neutral-300">Exam Probability Border:</div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-indigo-500" /> High Probability (Purple)</div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-purple-500" /> Important (Dark Blue)</div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-neutral-700" /> Revision Topic (Matte Grey)</div>
                </div>
              </div>

              {/* Concept Explorer Column */}
              <aside className="w-96 bg-[#131b2e]/30 backdrop-blur-sm border-l border-white/5 flex flex-col flex-shrink-0 overflow-y-auto">
                <header className="p-6 border-b border-white/5">
                  <h3 className="text-xs font-bold text-[#c0c1ff] uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#c0c1ff]" />
                    <span>AI Concept Explorer</span>
                  </h3>
                </header>

                <div className="p-6 flex-grow">
                  {selectedNode ? (
                    <div className="space-y-6 animate-slide-up">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] bg-indigo-500/10 text-indigo-400 font-bold px-2 py-0.5 rounded border border-indigo-500/20 uppercase">
                            {selectedNode.group}
                          </span>
                          <div className="flex gap-1.5">
                            <button 
                              onClick={() => handleUpdateStatus(selectedNode, 'strong')}
                              className={`px-2 py-0.5 text-[8px] font-bold rounded ${selectedNode.status === 'strong' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}
                            >
                              ⭐ Mastery
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(selectedNode, 'weak')}
                              className={`px-2 py-0.5 text-[8px] font-bold rounded ${selectedNode.status === 'weak' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}
                            >
                              🔥 Weak
                            </button>
                          </div>
                        </div>
                        <h4 className="text-base font-extrabold text-white">{selectedNode.label}</h4>
                      </div>

                      {loadingNodeDetails && !selectedNode.explanation ? (
                        <div className="space-y-4 animate-fade-in">
                          {/* Definition Shimmer */}
                          <div className="space-y-2 bg-slate-950/40 p-4 border border-slate-800/40 rounded-xl">
                            <div className="h-2 w-16 bg-slate-800 rounded animate-pulse" />
                            <div className="h-3.5 w-full bg-slate-800/60 rounded animate-pulse" />
                            <div className="h-3.5 w-5/6 bg-slate-800/60 rounded animate-pulse" />
                          </div>
                          {/* Explanation Shimmer */}
                          <div className="space-y-2 bg-[#131b2e]/10 p-4 border border-white/5 rounded-xl">
                            <div className="h-2 w-28 bg-slate-800 rounded animate-pulse" />
                            <div className="h-3.5 w-full bg-slate-800/60 rounded animate-pulse" />
                            <div className="h-3.5 w-11/12 bg-slate-800/60 rounded animate-pulse" />
                            <div className="h-3.5 w-4/5 bg-slate-800/60 rounded animate-pulse" />
                          </div>
                          {/* Diagram Shimmer */}
                          <div className="space-y-2 bg-slate-950/40 p-4 border border-slate-800/40 rounded-xl">
                            <div className="h-2 w-24 bg-slate-800 rounded animate-pulse" />
                            <div className="h-24 w-full bg-slate-800/30 rounded-lg animate-pulse" />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 font-body-md text-xs">
                          {/* Definition */}
                          <div className="space-y-1 bg-slate-950/40 p-3.5 border border-slate-800/40 rounded-xl leading-relaxed">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#c0c1ff]">Definition</span>
                            <p className="text-[#c7c4d7] mt-1">{selectedNode.definition}</p>
                          </div>

                          {/* Explanation */}
                          {selectedNode.explanation && (
                            <div className="space-y-1.5 bg-[#131b2e]/10 p-3.5 border border-white/5 rounded-xl leading-relaxed">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Detailed Explanation</span>
                              <p className="text-slate-300 mt-1 whitespace-pre-wrap">{selectedNode.explanation}</p>
                            </div>
                          )}

                          {/* Diagram */}
                          {selectedNode.diagram && (
                            <div className="space-y-1.5 bg-slate-950/40 p-3.5 border border-slate-800/40 rounded-xl leading-relaxed">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Concept Diagram</span>
                              <div className="mt-2 bg-slate-950 border border-slate-800 rounded-lg p-2 flex justify-center items-center overflow-x-auto">
                                <img 
                                  src={getMermaidUrl(selectedNode.diagram)} 
                                  alt="Concept Diagram" 
                                  className="max-h-64 object-contain brightness-110 contrast-125"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Real World Example */}
                          {selectedNode.example && (
                            <div className="space-y-1 bg-slate-950/40 p-3.5 border border-slate-800/40 rounded-xl leading-relaxed">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#ffdcc5]">Real-World Example</span>
                              <p className="text-slate-400 mt-1">{selectedNode.example}</p>
                            </div>
                          )}

                          {/* Formulations/Codes */}
                          {selectedNode.formulas && selectedNode.formulas !== 'N/A' && (
                            <div className="space-y-1 bg-[#2d3449]/30 p-3.5 border border-white/5 rounded-xl font-mono text-[10px] text-indigo-300">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans block mb-1">Formulas / Syntax</span>
                              {selectedNode.formulas}
                            </div>
                          )}

                          {/* Interview Questions */}
                          {selectedNode.interviewQuestions && selectedNode.interviewQuestions.length > 0 && (
                            <div className="space-y-2 border-t border-slate-800/50 pt-4">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sample Exam Questions</span>
                              <div className="space-y-2">
                                {selectedNode.interviewQuestions.map((q, idx) => (
                                  <div key={idx} className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl space-y-1">
                                    <p className="font-semibold text-slate-300">Q: {q.question}</p>
                                    <p className="text-[#c7c4d7] italic mt-0.5">A: {q.answer}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-72 text-center text-slate-500 space-y-3 p-4 border border-dashed border-slate-800 rounded-xl">
                      <Network size={28} className="text-slate-600 animate-pulse" />
                      <span className="text-xs">Click any concept node on the mind-map to load its study profile details.</span>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}

          {/* Tab 2: AI Study Chat */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex overflow-hidden">
              <StudyChat />
            </div>
          )}

          {/* Tab 3: Spaced Repetition (Flashcards) */}
          {activeTab === 'flashcards' && (
            <div className="flex-grow flex flex-col items-center justify-start p-8 bg-[#060e20] overflow-y-auto min-h-0">
              <div className="w-full max-w-lg space-y-6">
                
                {/* Mode Selector */}
                <div className="flex justify-between items-center bg-slate-950/60 p-1.5 border border-slate-800 rounded-2xl">
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setFlashcardMode('browse');
                        setCurrentCardIdx(0);
                        setIsFlipped(false);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        flashcardMode === 'browse' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      📚 Browse All ({flashcards.length})
                    </button>
                    <button
                      onClick={() => {
                        setFlashcardMode('review');
                        setCurrentCardIdx(0);
                        setIsFlipped(false);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        flashcardMode === 'review' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      🔔 Due for Review ({dueCards.length})
                    </button>
                  </div>
                  
                  {/* Quick self-test hide-answer toggle (default is showing both) */}
                  <button
                    onClick={() => setIsFlipped(prev => !prev)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 px-3 py-1.5 rounded-xl bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors mr-1"
                  >
                    {isFlipped ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span>{isFlipped ? 'Show Answer' : 'Hide Answer'}</span>
                  </button>
                </div>

                {/* Card rendering logic */}
                {(() => {
                  const activeCards = flashcardMode === 'browse' ? flashcards : dueCards;
                  
                  if (activeCards.length === 0) {
                    return (
                      <div className="p-16 border border-dashed border-slate-800 rounded-[2rem] text-center space-y-4 bg-slate-900/10">
                        <Layers className="mx-auto text-slate-600 animate-pulse" size={36} />
                        <h4 className="text-sm font-bold text-white">
                          {flashcardMode === 'browse' ? 'No Flashcards Found' : 'All caught up!'}
                        </h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                          {flashcardMode === 'browse' 
                            ? 'No flashcards are registered for this subject yet. Upload study materials in the Library to automatically extract decks.'
                            : 'You have zero flashcards due for review today. Toggle "Browse All" above to study the entire deck at your own pace.'}
                        </p>
                      </div>
                    );
                  }

                  const card = activeCards[currentCardIdx];
                  if (!card) return null;

                  return (
                    <div className="space-y-6">
                      
                      {/* Premium Stacked Card View */}
                      <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-8 flex flex-col justify-between items-stretch text-left relative min-h-[300px] shadow-[0_10px_35px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-300">
                        <div className="space-y-6">
                          {/* Question Section */}
                          <div>
                            <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                              Question
                            </span>
                            <p className="text-sm md:text-base font-bold text-slate-100 leading-relaxed font-body-lg mt-4">
                              {card.front}
                            </p>
                          </div>
                          
                          {/* Answer Section (Always visible unless self-test "isFlipped" is active) */}
                          <div className={`border-t border-neutral-800/80 pt-6 transition-all duration-300 ${isFlipped ? 'opacity-10 pointer-events-none filter blur-sm select-none' : 'opacity-100'}`}>
                            <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                              Answer
                            </span>
                            
                            {isFlipped ? (
                              <p className="text-xs text-slate-500 italic mt-4 select-none">
                                Answer hidden. Click "Show Answer" in the toggle bar above to reveal it.
                              </p>
                            ) : (
                              <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-body-md mt-4 whitespace-pre-wrap">
                                {card.back}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Previous & Next Controls */}
                      <div className="flex items-center justify-between bg-slate-950/20 px-4 py-2 rounded-xl border border-white/5">
                        <button
                          disabled={currentCardIdx === 0}
                          onClick={() => {
                            if (currentCardIdx > 0) {
                              setCurrentCardIdx(prev => prev - 1);
                            }
                          }}
                          className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 shadow"
                        >
                          <ChevronLeft size={14} />
                          <span>Previous</span>
                        </button>
                        
                        <span className="text-xs font-bold text-slate-500 font-mono">
                          {currentCardIdx + 1} / {activeCards.length}
                        </span>
                        
                        <button
                          disabled={currentCardIdx === activeCards.length - 1}
                          onClick={() => {
                            if (currentCardIdx < activeCards.length - 1) {
                              setCurrentCardIdx(prev => prev + 1);
                            }
                          }}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 shadow"
                        >
                          <span>Next</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>

                      {/* Ratings Options (Spaced Repetition feedback - only show for review mode cards) */}
                      {flashcardMode === 'review' && !isFlipped && (
                        <div className="space-y-4 animate-fade-in">
                          <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-extrabold text-center">Rate your recall level to update card scheduling:</p>
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={() => handleReviewCard(1)}
                              className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 rounded-xl text-[10px] font-extrabold transition-all active:scale-95"
                            >
                              🔵 Hard
                            </button>
                            <button 
                              onClick={() => handleReviewCard(3)}
                              className="px-4 py-2 bg-neutral-800/40 border border-neutral-700/50 text-neutral-300 hover:bg-neutral-800/60 rounded-xl text-[10px] font-extrabold transition-all active:scale-95"
                            >
                              ⚪ Medium
                            </button>
                            <button 
                              onClick={() => handleReviewCard(5)}
                              className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-[10px] font-extrabold transition-all active:scale-95"
                            >
                              🟣 Easy
                            </button>
                          </div>
                        </div>
                      )}

                      {reviewSuccess && (
                        <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 text-indigo-300 rounded-xl text-xs font-semibold animate-slide-up max-w-xs mx-auto text-center">
                          {reviewSuccess}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Tab 4: Practice Quizzes */}
          {activeTab === 'quiz' && (
            <div className="flex-grow flex flex-col items-center justify-center p-8 bg-[#060e20] overflow-y-auto">
              <div className="w-full max-w-xl space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white">Comprehension Practice Quizzes</h3>
                  <p className="text-xs text-slate-400 mt-1">Select an AI-generated multiple-choice quiz based on your uploaded subject texts.</p>
                </div>

                {quizScore && (
                  <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-center animate-slide-up flex flex-col items-center gap-2">
                    <Sparkles className="text-indigo-400" size={24} />
                    <div>
                      <h4 className="text-sm font-bold text-white">Quiz Attempt Completed!</h4>
                      <p className="text-xs text-[#c7c4d7] mt-1">Score: {quizScore.score}/{quizScore.total}. XP awarded accordingly.</p>
                    </div>
                    <button 
                      onClick={() => setQuizScore(null)}
                      className="mt-2 text-[10px] border border-indigo-500/30 text-indigo-300 px-3 py-1 rounded-lg"
                    >
                      Clear Notice
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  {quizzes.length > 0 ? (
                    quizzes.map((q) => (
                      <div 
                        key={q._id}
                        className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate max-w-[340px]">{q.title}</h4>
                          <p className="text-[10px] text-slate-500 mt-1">{q.questions.length} questions • {q.attempts.length} attempts taken</p>
                        </div>
                        <button 
                          onClick={() => {
                            setQuizScore(null);
                            setActiveQuizId(q._id);
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <span>Start Quiz</span>
                          <ArrowRight size={10} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-16 border border-dashed border-slate-800 rounded-2xl text-center space-y-3 bg-slate-900/10">
                      <QuizIcon className="mx-auto text-slate-600" size={36} />
                      <h4 className="text-sm font-bold text-white">No Quizzes Configured</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                        No custom quizzes have been generated for this subject yet. Upload a notes text to extract quiz contents.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudyArena;
