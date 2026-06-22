import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useStudyStore } from '../store/useStudyStore';

const Library: React.FC = () => {
  const navigate = useNavigate();
  const { 
    token, 
    documents, 
    fetchDocuments, 
    deleteDocument, 
    fetchGraph,
    apiFetch,
    apiBaseUrl
  } = useStudyStore();

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [subject, setSubject] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchDocuments();
    // Poll document statuses every 5 seconds if there are files in 'processing' state
    const hasProcessing = documents.some(d => d.status === 'processing');
    if (hasProcessing) {
      const interval = setInterval(() => {
        fetchDocuments();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [documents, fetchDocuments]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      if (!subject) {
        // Pre-fill subject based on file name minus extension
        setSubject(droppedFile.name.replace(/\.[^/.]+$/, '').substring(0, 30));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!subject) {
        setSubject(selectedFile.name.replace(/\.[^/.]+$/, '').substring(0, 30));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !subject.trim() || !token) return;

    setUploading(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', subject.trim());
    
    try {
      // 1. Upload Document (which starts background PDF and graph processing)
      const uploadRes = await fetch(`${apiBaseUrl}/docs/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setFile(null);
      setSubject('');
      fetchDocuments();
      alert('File uploaded successfully. AI processing graph, flashcards and quizzes in the background.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'File size exceeds limit or format is unsupported.');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenDocInArena = async (doc: any) => {
    const docSubject = doc.subject || doc.name.replace(/\.[^/.]+$/, '');
    await fetchGraph(docSubject);
    navigate('/arena');
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-extrabold text-white tracking-tight font-headline-xl">Study Library</h2>
        <p className="text-sm text-[#c7c4d7] font-body-lg">
          Upload books, lecture notes, or research papers (PDF, DOCX, TXT) to generate interactive mind-maps and flashcard sets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form Area */}
        <div className="glass-card rounded-[24px] p-6 h-fit border border-white/10">
          <h3 className="text-base font-bold text-[#c0c1ff] mb-4 flex items-center gap-2">
            <Sparkles size={16} />
            <span>Upload New Material</span>
          </h3>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {/* Subject Input */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Subject Title</label>
              <input 
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. DBMS Normalization"
                className="w-full bg-[#131b2e] border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Dropzone Area */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-[20px] p-8 text-center transition-all cursor-pointer relative ${
                dragActive 
                  ? 'border-indigo-500 bg-indigo-500/5' 
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
              }`}
            >
              <input 
                type="file" 
                onChange={handleFileChange}
                accept=".pdf,.docx,.doc,.txt"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <Upload className="mx-auto text-slate-500 mb-3" size={32} />
              
              {file ? (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white truncate max-w-[200px] mx-auto">{file.name}</p>
                  <p className="text-[10px] text-slate-500">{formatSize(file.size)}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#c7c4d7]">Drag and drop your study file</p>
                  <p className="text-[10px] text-slate-500">Supports PDF, DOCX, TXT (Max 15MB)</p>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex gap-2 items-center">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button 
              type="submit"
              disabled={uploading || !file || !subject.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing AI Analysis...</span>
                </>
              ) : (
                <>
                  <span>Upload & Analyze</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Documents List Area */}
        <div className="lg:col-span-2 glass-card rounded-[24px] p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-4">My Study Materials</h3>
            
            {documents.length === 0 ? (
              <div className="p-20 text-center border border-dashed border-slate-800 rounded-xl">
                <FileText className="mx-auto text-slate-600 mb-2" size={36} />
                <p className="text-xs text-[#c7c4d7]">Your study library is currently empty.</p>
                <p className="text-[10px] text-slate-500 mt-1">Upload a notes PDF on the left to start indexing.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {documents.map((doc) => (
                  <div 
                    key={doc._id}
                    className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg ${
                        doc.status === 'completed' 
                          ? 'bg-indigo-500/10 text-indigo-400' 
                          : doc.status === 'failed' 
                          ? 'bg-red-500/10 text-red-400' 
                          : 'bg-slate-900 text-slate-500'
                      }`}>
                        {doc.status === 'processing' ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <FileText size={18} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-200 truncate max-w-[260px] md:max-w-[360px]">
                          {doc.name}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                          <span>{formatSize(doc.size)}</span>
                          <span>•</span>
                          <span className="capitalize">{doc.status}</span>
                          {doc.conceptCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-400 font-semibold">{doc.conceptCount} concepts mapped</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {doc.status === 'completed' && (
                        <button 
                          onClick={() => handleOpenDocInArena(doc)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"
                        >
                          <span>Open Arena</span>
                          <ArrowRight size={10} />
                        </button>
                      )}
                      {doc.status === 'failed' && (
                        <button 
                          onClick={async () => {
                            try {
                              await apiFetch(`/docs/${doc._id}/retry`, { method: 'POST' });
                              fetchDocuments();
                            } catch (err) {
                              console.error('Retry failed:', err);
                            }
                          }}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"
                        >
                          <span>Retry</span>
                        </button>
                      )}
                      
                      <button 
                        onClick={() => deleteDocument(doc._id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Library;
