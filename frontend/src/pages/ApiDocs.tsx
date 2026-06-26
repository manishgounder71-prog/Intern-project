import React from 'react';

const endpoints = [
  {
    category: 'Authentication',
    color: 'from-emerald-500 to-teal-600',
    routes: [
      {
        method: 'POST', path: '/auth/register', auth: false,
        desc: 'Create a new user account.',
        body: { name: 'String (required)', email: 'String (required)', password: 'String (required)' },
        res: { token: 'JWT String', user: '{ id, name, email, xp, level, streak, avatar }' },
        errors: ['400 — Missing fields or email already exists']
      },
      {
        method: 'POST', path: '/auth/login', auth: false,
        desc: 'Authenticate existing user. Updates login streak.',
        body: { email: 'String (required)', password: 'String (required)' },
        res: { token: 'JWT String', user: '{ id, name, email, xp, level, streak, avatar }' },
        errors: ['400 — Missing fields', '401 — Invalid email or password']
      },
      {
        method: 'POST', path: '/auth/forgot-password', auth: false,
        desc: 'Request a password reset token (returns token directly, 1-hour expiry).',
        body: { email: 'String (required)' },
        res: { message: 'String', resetToken: 'String (32-byte hex)' },
        errors: ['400 — Missing email', '404 — No account found']
      },
      {
        method: 'POST', path: '/auth/reset-password/:token', auth: false,
        desc: 'Reset password using the token from forgot-password.',
        body: { password: 'String (required)' },
        res: { message: 'String' },
        errors: ['400 — Missing password or invalid/expired token']
      },
      {
        method: 'GET', path: '/auth/profile', auth: true,
        desc: 'Get authenticated user profile and learning statistics.',
        body: null,
        res: { user: '{ id, name, email, xp, level, streak, avatar }', stats: '{ documentsUploaded, flashcardsCreated, quizzesTaken, averageScore }' },
        errors: ['404 — User not found']
      },
      {
        method: 'PUT', path: '/auth/profile', auth: true,
        desc: 'Update user profile (name, email, avatar).',
        body: { name: 'String (optional)', email: 'String (optional)', avatar: 'String (optional)' },
        res: { user: '{ id, name, email, xp, level, streak, avatar }' },
        errors: ['400 — Email already in use', '404 — User not found']
      }
    ]
  },
  {
    category: 'Documents & Library',
    color: 'from-blue-500 to-cyan-600',
    routes: [
      {
        method: 'POST', path: '/docs/upload', auth: true,
        desc: 'Upload PDF/DOCX/TXT file (max 15MB). Processing runs in background, returns 202 immediately.',
        body: { file: 'File (multipart, required)', subject: 'String (optional, defaults to filename)' },
        res: { message: 'String', document: '{ _id, name, path, mimeType, size, status: "processing", subject }' },
        errors: ['400 — No file or invalid type']
      },
      {
        method: 'GET', path: '/docs', auth: true,
        desc: 'List all documents for the authenticated user, newest first.',
        body: null,
        res: '[ { _id, name, path, mimeType, size, status, subject, conceptCount, error, createdAt } ]',
        errors: []
      },
      {
        method: 'DELETE', path: '/docs/:id', auth: true,
        desc: 'Delete document and all AI-generated resources (chunks, graph, flashcards, quizzes, file).',
        body: null,
        res: '{ message: "Document and all derived AI study resources deleted successfully." }',
        errors: ['404 — Document not found']
      },
      {
        method: 'POST', path: '/docs/:id/retry', auth: true,
        desc: 'Retry AI processing on a failed document.',
        body: null,
        res: '{ message: "Retrying document processing in the background.", document: { ... } }',
        errors: ['400 — Document not in "failed" status', '404 — Document not found']
      }
    ]
  },
  {
    category: 'Flashcards (Spaced Repetition)',
    color: 'from-amber-500 to-orange-600',
    routes: [
      {
        method: 'GET', path: '/study/flashcards', auth: true,
        desc: 'Retrieve all flashcards. Optionally filter by document.',
        body: null,
        qs: { documentId: 'String (optional)' },
        res: '[ { _id, front, back, document, owner, repetition, interval, efactor, nextReviewDate } ]',
        errors: []
      },
      {
        method: 'GET', path: '/study/flashcards/due', auth: true,
        desc: 'Get all flashcards due for review (nextReviewDate <= now) using SRS algorithm.',
        body: null,
        res: '[ { ...flashcard fields } ]',
        errors: []
      },
      {
        method: 'POST', path: '/study/flashcards/:id/review', auth: true,
        desc: 'Review a flashcard using SuperMemo SM-2 algorithm. Awards +10 XP.',
        body: { rating: 'Number (1 = Hard, 3 = Medium, 5 = Easy, required)' },
        res: '{ message, xp, level, flashcard: { ...updated flashcard } }',
        errors: ['400 — Rating not 1, 3, or 5', '404 — Flashcard not found']
      }
    ]
  },
  {
    category: 'Quizzes & Assessments',
    color: 'from-purple-500 to-pink-600',
    routes: [
      {
        method: 'GET', path: '/study/quizzes', auth: true,
        desc: 'Retrieve all quizzes. Optionally filter by document.',
        body: null,
        qs: { documentId: 'String (optional)' },
        res: '[ { _id, title, document, owner, questions[], attempts[] } ]',
        errors: []
      },
      {
        method: 'GET', path: '/study/quizzes/:id', auth: true,
        desc: 'Get full quiz details including questions and past attempt history.',
        body: null,
        res: '{ ...full quiz object }',
        errors: ['404 — Quiz not found']
      },
      {
        method: 'POST', path: '/study/quizzes/:id/submit', auth: true,
        desc: 'Submit quiz answers. Auto-grades and awards XP (+20 per correct answer).',
        body: { answers: 'Number[] (array of selected option indexes, required)' },
        res: '{ message, xp, attempt: { score, totalQuestions, answers, completedAt }, quiz }',
        errors: ['400 — Invalid answers format or length mismatch', '404 — Quiz not found']
      }
    ]
  },
  {
    category: 'Concept Graph Data',
    color: 'from-indigo-500 to-violet-600',
    routes: [
      {
        method: 'GET', path: '/study/graph', auth: true,
        desc: 'Get concept graph nodes and edges. Shows document-specific or merged global mind map.',
        body: null,
        qs: { documentId: 'String (optional)' },
        res: '{ nodes: [ { id, label, description, group } ], edges: [ { id, source, target, label } ] }',
        errors: []
      }
    ]
  },
  {
    category: 'AI Knowledge Graph',
    color: 'from-rose-500 to-red-600',
    routes: [
      {
        method: 'POST', path: '/graph/generate', auth: true,
        desc: 'Generate a knowledge graph + learning path from text for a subject.',
        body: { subject: 'String (required)', text: 'String (required)' },
        res: '{ message, graphId, nodes[], edges[] }',
        errors: ['400 — Missing subject or text']
      },
      {
        method: 'GET', path: '/graph/analytics', auth: true,
        desc: 'Get learning analytics: concept count, connections, topic strength, progress %.',
        body: null,
        qs: { subject: 'String (optional)' },
        res: '{ totalConcepts, totalConnections, strongTopics, weakTopics, studyProgress, mostConnected[] }',
        errors: []
      },
      {
        method: 'GET', path: '/graph/recommendations', auth: true,
        desc: 'Get personalized study recommendations based on weak topics and prerequisites.',
        body: null,
        qs: { subject: 'String (required)' },
        res: '{ recommendations: [ { type, nodeId, label, reason } ], nextTopic }',
        errors: ['400 — Missing subject']
      },
      {
        method: 'GET', path: '/graph/node/:id', auth: true,
        desc: 'Get detailed profile for a concept node (definition, explanation, examples, quiz, interview Qs).',
        body: null,
        res: '{ _id, nodeId, label, group, definition, explanation, example, formulas, diagram, relatedTopics, interviewQuestions, quizQuestions }',
        errors: ['404 — Node not found']
      },
      {
        method: 'POST', path: '/graph/chat', auth: true,
        desc: 'Chat with AI tutor about a specific knowledge graph subject.',
        body: { subject: 'String (required)', message: 'String (required)' },
        res: '{ response: "String", history: [ { role, content } ] }',
        errors: ['400 — Missing subject or message', '404 — Graph not found']
      },
      {
        method: 'GET', path: '/graph/:subject', auth: true,
        desc: 'Get an existing knowledge graph by subject name with all nodes and edges.',
        body: null,
        res: '{ graph: { ... }, nodes: [ ... ], edges: [ ... ] }',
        errors: ['404 — No graph found for subject']
      }
    ]
  }
];

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PUT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const ApiDocs: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center pb-8 border-b border-white/10">
          <h1 className="text-4xl font-extrabold text-white font-headline-xl">
            StudyGen AI — API Reference
          </h1>
          <p className="text-[#c7c4d7] mt-3 text-lg">
            Complete REST API documentation for all backend endpoints
          </p>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm text-[#c7c4d7]">
            <span><span className="text-emerald-400 font-bold">23</span> Endpoints</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span>Base URL: <code className="text-indigo-400 bg-[#131b2e] px-2 py-0.5 rounded">https://studygen-backend-5pvu.onrender.com/api</code></span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span>Auth: <code className="text-indigo-400 bg-[#131b2e] px-2 py-0.5 rounded">Bearer &lt;JWT&gt;</code></span>
          </div>
        </div>

        {/* Endpoint Categories */}
        {endpoints.map((category) => (
          <section key={category.category} className="space-y-4">
            <div className={`inline-block px-5 py-2 rounded-full bg-gradient-to-r ${category.color} text-white font-bold text-sm shadow-lg`}>
              {category.category}
            </div>

            <div className="space-y-3">
              {category.routes.map((route) => (
                <div key={`${route.method}-${route.path}`} className="glass-card rounded-2xl border border-white/5 overflow-hidden">
                  {/* Endpoint Header */}
                  <div className="flex items-center gap-3 px-6 py-4 bg-[#131b2e]/60 border-b border-white/5">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${methodColors[route.method] || methodColors.GET}`}>
                      {route.method}
                    </span>
                    <code className="text-sm font-mono text-white flex-1">{route.path}</code>
                    {route.auth ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">Auth Required</span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Public</span>
                    )}
                  </div>

                  {/* Description */}
                  <div className="px-6 py-3 border-b border-white/5">
                    <p className="text-sm text-[#c7c4d7]">{route.desc}</p>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    {/* Request Body */}
                    {route.body && (
                      <div className="px-6 py-4 border-r border-white/5">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-2">Request Body</h4>
                        <div className="space-y-1">
                          {Object.entries(route.body).map(([field, type]) => (
                            <div key={field} className="flex gap-2 text-xs">
                              <code className="text-emerald-400 font-mono whitespace-nowrap">{field}</code>
                              <span className="text-[#c7c4d7]">— {type as string}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Query String */}
                    {route.qs && (
                      <div className="px-6 py-4 border-r border-white/5">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-2">Query Parameters</h4>
                        <div className="space-y-1">
                          {Object.entries(route.qs).map(([field, type]) => (
                            <div key={field} className="flex gap-2 text-xs">
                              <code className="text-cyan-400 font-mono whitespace-nowrap">{field}</code>
                              <span className="text-[#c7c4d7]">— {type as string}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Response */}
                    <div className="px-6 py-4 border-r border-white/5">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-2">Response</h4>
                      <pre className="text-xs text-[#c7c4d7] font-mono leading-relaxed whitespace-pre-wrap">
                        {typeof route.res === 'string' ? route.res : JSON.stringify(route.res, null, 2)}
                      </pre>
                    </div>

                    {/* Errors */}
                    {route.errors.length > 0 && (
                      <div className="px-6 py-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-2">Errors</h4>
                        <div className="space-y-1">
                          {route.errors.map((err) => (
                            <div key={err} className="text-xs text-red-400/80">⚠ {err}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Footer */}
        <div className="text-center pt-8 border-t border-white/10 text-xs text-[#c7c4d7]">
          StudyGen AI — API Documentation v1.0.0
        </div>
      </div>
    </div>
  );
};

export default ApiDocs;
