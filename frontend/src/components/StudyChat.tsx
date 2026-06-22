import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Send, 
  Sparkles,
  Bot,
  User
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useStudyStore } from '../store/useStudyStore';
import type { ChatMessage, DocumentFile } from '../store/useStudyStore';

const StudyChat: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigateQuery = searchParams.get('q');
  
  const token = useStudyStore(state => state.token);
  const documents = useStudyStore(state => state.documents);
  const fetchDocuments = useStudyStore(state => state.fetchDocuments);
  const chatHistory = useStudyStore(state => state.chatHistory);
  const addChatMessage = useStudyStore(state => state.addChatMessage);
  const setChatHistory = useStudyStore(state => state.setChatHistory);
  const clearChat = useStudyStore(state => state.clearChat);

  const [activeDoc, setActiveDoc] = useState<DocumentFile | null>(null);
  const [inputMsg, setInputMsg] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [citations, setCitations] = useState<{ documentName: string; chunkIndex: number; snippet: string }[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeTopic, setActiveTopic] = useState('Quantum Mechanics');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!token) return;

    fetchDocuments();

    // Setup Socket
    const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket']
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Socket connected successfully for study chat.');
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err);
      setIsThinking(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsThinking(false);
    });

    // Listen for citations
    newSocket.on('chat-citations', (citationsData) => {
      setCitations(citationsData);
    });

    // Listen for response streaming chunks
    let currentAIResponse = '';
    newSocket.on('chat-chunk', (chunk: string) => {
      setIsThinking(false);
      currentAIResponse += chunk;
      
      // Update the last message in chat history dynamically
      setChatHistory([
        ...useStudyStore.getState().chatHistory.slice(0, -1),
        { role: 'assistant', content: currentAIResponse, citations: [] }
      ]);
    });

    // Listen for complete message transmission
    newSocket.on('chat-end', () => {
      setIsThinking(false);
      // Append citation structures to the completed message
      setChatHistory([
        ...useStudyStore.getState().chatHistory.slice(0, -1),
        { 
          role: 'assistant', 
          content: useStudyStore.getState().chatHistory[useStudyStore.getState().chatHistory.length - 1]?.content || '', 
          citations: useStudyStore.getState().chatHistory[useStudyStore.getState().chatHistory.length - 1]?.citations || [] 
        }
      ]);
    });

    newSocket.on('chat-error', (errMsg: string) => {
      setIsThinking(false);
      alert(`AI error: ${errMsg}`);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token, setChatHistory, fetchDocuments]);

  // Handle passed search query from CMD+K
  useEffect(() => {
    if (navigateQuery && socketRef.current) {
      sendMessage(navigateQuery);
    }
  }, [navigateQuery, socket]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isThinking]);

  // Send Message
  const sendMessage = (messageText: string) => {
    if (!messageText.trim()) return;

    // Append User message
    const userMsg: ChatMessage = { role: 'user', content: messageText };
    addChatMessage(userMsg);

    // Append initial empty AI message for streaming chunks
    const emptyAIMsg: ChatMessage = { role: 'assistant', content: '' };
    addChatMessage(emptyAIMsg);

    setIsThinking(true);
    setCitations([]);

    // Send via socket
    socketRef.current?.emit('send-message', {
      documentId: activeDoc?._id || null,
      message: messageText,
      chatHistory: chatHistory.slice(-5) // Send last 5 exchanges for session memory
    });

    setInputMsg('');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMsg);
  };

  const getTopicPercentage = () => {
    return activeDoc ? 85 : 70;
  };

  return (
    <div className="flex flex-1 h-[calc(screen-64px)] overflow-hidden bg-[#0b1326] text-[#dae2fd]">
      {/* Left Panel: Context/Sources */}
      <section className="w-72 bg-[#131b2e]/30 backdrop-blur-sm border-r border-white/5 flex flex-col hidden xl:flex">
        <header className="p-6 border-b border-white/5">
          <h2 className="text-xs font-bold text-[#c0c1ff] uppercase tracking-widest font-label-sm">Document Context</h2>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Active Study File</span>
          {activeDoc ? (
            <div className="glass-panel p-4 rounded-xl space-y-3 border-indigo-500/20 bg-indigo-500/5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#c0c1ff] text-[20px]">article</span>
                <span className="text-xs font-bold text-white truncate max-w-[180px]">{activeDoc.name}</span>
              </div>
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400 w-3/4 shadow-[0_0_8px_rgba(192,193,255,0.5)]"></div>
              </div>
              <p className="text-[10px] text-[#c7c4d7] leading-relaxed">
                Document parsed successfully. Vector indices initialized. ready to query.
              </p>
              <button 
                onClick={() => setActiveDoc(null)}
                className="text-[9px] text-red-400 font-bold hover:underline"
              >
                Clear Document Focus
              </button>
            </div>
          ) : (
            <div className="border border-dashed border-slate-800 rounded-xl p-4 text-center">
              <span className="text-[11px] text-[#c7c4d7] block">No document selected.</span>
              <span className="text-[9px] text-slate-500 block mt-1">Queries will match global workspace context.</span>
            </div>
          )}

          <div className="space-y-2 mt-4">
            <p className="px-2 text-[11px] font-bold text-[#c7c4d7] uppercase tracking-wider">Select Context notes</p>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {documents.filter(d => d.status === 'completed').map((doc) => (
                <button 
                  key={doc._id}
                  onClick={() => {
                    setActiveDoc(doc);
                    setActiveTopic(doc.subject || doc.name.replace(/\.[^/.]+$/, ''));
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs truncate transition-all ${
                    activeDoc?._id === doc._id 
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20' 
                      : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                  }`}
                >
                  {doc.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Center Column: Chat Window */}
      <section className="flex-grow flex flex-col relative bg-[#0b1326] min-h-[500px]">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-[#0b1326]/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#c0c1ff] animate-pulse" />
            <h2 className="text-sm font-bold text-[#c0c1ff]">
              Active Study Arena: {activeTopic}
            </h2>
          </div>
          <button 
            onClick={clearChat}
            className="text-[10px] text-red-400 hover:text-red-300 font-bold border border-red-500/20 px-2.5 py-1 rounded-lg hover:bg-red-500/5 transition-colors"
          >
            Clear History
          </button>
        </header>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 max-w-3xl mx-auto w-full">
          {chatHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4 opacity-75">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center text-[#c0c1ff] shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                <Bot size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-headline-lg">Start your Study Session</h4>
                <p className="text-xs text-[#c7c4d7] mt-1 max-w-sm">
                  Ask me questions based on your notes, request explanations, or generate comparisons.
                </p>
              </div>
            </div>
          ) : (
            chatHistory.map((msg, index) => {
              const isUser = msg.role === 'user';
              if (isUser) {
                return (
                  <div key={index} className="flex gap-4 group animate-slide-up">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-400">
                      <User size={16} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-label-sm">You</div>
                      <p className="text-sm text-slate-200 mt-1 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={index} className="flex gap-4 animate-slide-up">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]">
                      <Bot size={16} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider font-label-sm">StudyGen AI</div>
                      
                      {msg.content === '' && isThinking ? (
                        <div className="flex gap-1.5 items-center h-8 mt-1">
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full thinking-dot" />
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full thinking-dot" />
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full thinking-dot" />
                        </div>
                      ) : (
                        <div className="text-sm text-slate-200 mt-2 leading-relaxed whitespace-pre-wrap font-body-md bg-[#131b2e]/30 border border-white/5 rounded-xl p-4 shadow-sm">
                          {msg.content}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            })
          )}

          {isThinking && chatHistory[chatHistory.length - 1]?.role === 'user' && (
            <div className="flex gap-4 animate-slide-up">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]">
                <Bot size={16} />
              </div>
              <div className="flex gap-1.5 items-center h-8 mt-2">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full thinking-dot" />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full thinking-dot" />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full thinking-dot" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 max-w-3xl mx-auto w-full mt-auto">
          <form onSubmit={handleFormSubmit} className="relative glass-card rounded-2xl p-2 focus-within:ring-1 focus-within:ring-indigo-500/40 bg-slate-900/60 border border-slate-800">
            <textarea 
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(inputMsg);
                }
              }}
              placeholder="Ask anything about your documents..."
              rows={2}
              className="w-full bg-transparent border-none focus:ring-0 text-slate-200 placeholder-slate-500 py-2 px-3 resize-none focus:outline-none text-sm leading-relaxed"
            />
            <div className="flex items-center justify-between px-3 pb-1 pt-2 border-t border-white/5">
              <div className="flex items-center gap-1">
                <button type="button" className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">attach_file</span>
                </button>
                <button type="button" className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">image</span>
                </button>
              </div>
              <button 
                type="submit"
                disabled={isThinking || !inputMsg.trim()}
                className="bg-[#c0c1ff] hover:bg-[#8083ff] text-[#1000a9] font-bold text-xs px-5 py-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(192,193,255,0.4)] flex items-center gap-1.5 active:scale-95"
              >
                <span>Send</span>
                <Send size={12} />
              </button>
            </div>
          </form>
          <p className="text-center text-[10px] text-slate-500 mt-3">StudyGen AI parses local text segments. Double check responses.</p>
        </div>
      </section>

      {/* Right Panel: AI Insights & Citations */}
      <section className="w-80 bg-[#131b2e]/30 backdrop-blur-sm border-l border-white/5 flex flex-col hidden lg:flex">
        <header className="p-6 border-b border-white/5">
          <h2 className="text-xs font-bold text-[#ffdcc5] uppercase tracking-widest font-label-sm">AI Citations</h2>
        </header>
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {/* Key Concept card */}
          {activeDoc && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Focused Subject</h3>
              <div className="glass-panel p-4 rounded-xl border-l-4 border-[#ffdcc5] relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-full shimmer opacity-10"></div>
                <p className="text-xs font-bold text-[#ffdcc5] mb-1">RAG Context Enabled</p>
                <p className="text-[11px] leading-relaxed text-[#c7c4d7]">
                  Extracting text slices matching search query vectors. Embedding vectors match: cosine distance &lt; 0.6.
                </p>
              </div>
            </div>
          )}

          {/* Citations List */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">References ({citations.length})</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {citations.length > 0 ? (
                citations.map((cite, index) => (
                  <div key={index} className="p-3 bg-slate-900/60 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-colors">
                    <span className="text-[10px] font-bold text-indigo-400 block mb-1">Ref [{index + 1}] {cite.documentName}</span>
                    <p className="text-[10px] text-slate-400 leading-normal italic line-clamp-3">"{cite.snippet}"</p>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-slate-900/30 border border-slate-800 text-center rounded-xl">
                  <span className="text-[10px] text-slate-500 block">No matching search citations yet.</span>
                </div>
              )}
            </div>
          </div>

          {/* Study Progress Indicator */}
          <div className="pt-6 border-t border-white/5">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Subject Mastery</h3>
            <div className="flex items-center justify-center relative py-2">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle className="text-slate-800" cx="56" cy="56" fill="transparent" r="48" stroke="currentColor" strokeWidth="6" />
                <circle 
                  className="text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]" 
                  cx="56" 
                  cy="56" 
                  fill="transparent" 
                  r="48" 
                  stroke="currentColor" 
                  strokeDasharray="301.6" 
                  strokeDashoffset={301.6 - (301.6 * getTopicPercentage()) / 100} 
                  strokeWidth="6" 
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white">{getTopicPercentage()}%</span>
                <span className="text-[8px] text-slate-500 uppercase tracking-wider">Ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StudyChat;
