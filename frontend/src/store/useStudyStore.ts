import { create } from 'zustand';

// Types for State
export interface User {
  id: string;
  name: string;
  email: string;
  xp: number;
  level: number;
  streak: number;
  avatar: string;
}

export interface UserStats {
  documentsUploaded: number;
  flashcardsCreated: number;
  quizzesTaken: number;
  averageScore: number;
}

export interface DocumentFile {
  _id: string;
  name: string;
  path: string;
  mimeType: string;
  size: number;
  status: 'processing' | 'completed' | 'failed';
  conceptCount: number;
  subject?: string;
  error?: string;
  createdAt: string;
}

export interface GraphNode {
  _id: string;
  nodeId: string;
  label: string;
  group: string;
  definition?: string;
  explanation?: string;
  example?: string;
  formulas?: string;
  diagram?: string;
  relatedTopics: string[];
  interviewQuestions: { question: string; answer: string }[];
  quizQuestions: { question: string; options: string[]; correctAnswerIndex: number; explanation?: string }[];
  status: 'not_studied' | 'studying' | 'weak' | 'strong';
  importance: 'high_probability' | 'important' | 'revision';
}

export interface GraphEdge {
  _id: string;
  edgeId: string;
  source: string;
  target: string;
  label: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: { documentName: string; chunkIndex: number; snippet: string }[];
}

interface StudyState {
  token: string | null;
  user: User | null;
  stats: UserStats | null;
  documents: DocumentFile[];
  activeSubject: string | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: GraphNode | null;
  loadingNodeDetails: boolean;
  chatHistory: ChatMessage[];
  apiBaseUrl: string;

  // Actions
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  apiFetch: (path: string, options?: RequestInit) => Promise<any>;
  
  // Library Actions
  fetchDocuments: () => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  
  // Graph Actions
  fetchGraph: (subject: string) => Promise<void>;
  generateGraphFromText: (subject: string, text: string) => Promise<void>;
  selectNodeById: (id: string) => Promise<void>;
  updateNodeStatus: (nodeId: string, status: 'not_studied' | 'studying' | 'weak' | 'strong') => Promise<void>;
  
  // Chat Actions
  addChatMessage: (msg: ChatMessage) => void;
  setChatHistory: (history: ChatMessage[]) => void;
  clearChat: () => void;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  token: localStorage.getItem('study_token'),
  user: localStorage.getItem('study_user') ? JSON.parse(localStorage.getItem('study_user')!) : null,
  stats: null,
  documents: [],
  activeSubject: null,
  nodes: [],
  edges: [],
  selectedNode: null,
  loadingNodeDetails: false,
  chatHistory: [],
  apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',

  setToken: (token) => {
    if (token) localStorage.setItem('study_token', token);
    else localStorage.removeItem('study_token');
    set({ token });
  },

  setUser: (user) => {
    if (user) localStorage.setItem('study_user', JSON.stringify(user));
    else localStorage.removeItem('study_user');
    set({ user });
  },

  logout: () => {
    localStorage.removeItem('study_token');
    localStorage.removeItem('study_user');
    set({ token: null, user: null, stats: null, documents: [], activeSubject: null, nodes: [], edges: [], selectedNode: null, chatHistory: [] });
  },

  apiFetch: async (path, options = {}) => {
    const { token, apiBaseUrl } = get();
    const headers = new Headers(options.headers || {});
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers
    });

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        get().logout();
      }
      throw new Error(data.error || 'API Request Failed');
    }
    return data;
  },

  fetchDocuments: async () => {
    try {
      const docs = await get().apiFetch('/docs');
      set({ documents: docs });
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  },

  deleteDocument: async (id) => {
    try {
      await get().apiFetch(`/docs/${id}`, { method: 'DELETE' });
      set(state => ({ documents: state.documents.filter(d => d._id !== id) }));
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  },

  fetchGraph: async (subject) => {
    try {
      set({ activeSubject: subject, selectedNode: null });
      const data = await get().apiFetch(`/graph/${encodeURIComponent(subject)}`);
      set({ nodes: data.nodes || [], edges: data.edges || [] });
    } catch (err) {
      console.error('Error fetching graph:', err);
      set({ nodes: [], edges: [] });
    }
  },

  generateGraphFromText: async (subject, text) => {
    const data = await get().apiFetch('/graph/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, text })
    });
    set({
      activeSubject: subject,
      nodes: data.nodes || [],
      edges: data.edges || [],
      selectedNode: null
    });
  },

  selectNodeById: async (id) => {
    set({ loadingNodeDetails: true });
    try {
      // First: immediately set selectedNode from the already-loaded nodes array
      // so the UI responds instantly without waiting for the API call
      const currentNodes = get().nodes;
      const cachedNode = currentNodes.find(n => n._id === id);
      if (cachedNode) {
        set({ selectedNode: cachedNode });
      }

      // Then fetch full details on-demand from the server
      const nodeDetails = await get().apiFetch(`/graph/node/${id}`);

      // Do a single atomic update — only touch selectedNode and the specific node in the list
      // Never overwrite the entire nodes/edges arrays
      set(state => ({
        selectedNode: nodeDetails,
        nodes: state.nodes.map(n => n._id === id ? { ...n, ...nodeDetails } : n)
      }));
    } catch (err) {
      console.error('Error selecting node:', err);
    } finally {
      set({ loadingNodeDetails: false });
    }
  },

  updateNodeStatus: async (nodeId, status) => {
    // This allows students to mark concepts studied, weak, or strong
    set(state => ({
      nodes: state.nodes.map(n => n.nodeId === nodeId ? { ...n, status } : n),
      selectedNode: state.selectedNode && state.selectedNode.nodeId === nodeId 
        ? { ...state.selectedNode, status } 
        : state.selectedNode
    }));
  },

  addChatMessage: (msg) => {
    set(state => ({ chatHistory: [...state.chatHistory, msg] }));
  },

  setChatHistory: (history) => {
    set({ chatHistory: history });
  },

  clearChat: () => {
    set({ chatHistory: [] });
  }
}));
