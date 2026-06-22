import jwt from 'jsonwebtoken';
import { generateEmbedding, getGeminiChatStream } from './gemini.js';
import { searchSimilarChunks } from './vectorStore.js';
import Document from '../../database/models/Document.js';

const JWT_SECRET = process.env.JWT_SECRET || 'studygen-secret-super-key-2026';

export const initSocketService = (io) => {
  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    
    if (!token) {
      return next(new Error('Authentication error: Token required.'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = { id: decoded.id };
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token.'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Student connected via Socket.IO: User ID: ${socket.user.id}, Socket ID: ${socket.id}`);

    // Join document specific study room
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`🚪 Socket ${socket.id} joined room ${roomId}`);
    });

    // Handle study chat messages
    socket.on('send-message', async (data) => {
      const { documentId, message, chatHistory = [] } = data;
      
      if (!message || message.trim().length === 0) {
        return socket.emit('chat-error', 'Message content is empty.');
      }

      console.log(`💬 User message received: "${message}" for doc: ${documentId || 'Global mind map'}`);

      try {
        let contextText = '';
        let citations = [];

        // 1. Vector Search Context (RAG)
        if (documentId) {
          const doc = await Document.findOne({ _id: documentId, owner: socket.user.id });
          if (doc) {
            // Generate query embedding
            const queryVector = await generateEmbedding(message);
            
            // Search vector chunks
            const matches = await searchSimilarChunks({
              ownerId: socket.user.id,
              documentId: doc._id,
              queryEmbedding: queryVector,
              limit: 3
            });

            if (matches.length > 0) {
              contextText = matches.map(m => `[Page Chunk ${m.chunkIndex}]: ${m.textContent}`).join('\n\n');
              citations = matches.map(m => ({
                documentName: doc.name,
                chunkIndex: m.chunkIndex,
                snippet: m.textContent.substring(0, 120) + '...'
              }));
              console.log(`🔍 Retrieved ${matches.length} context chunks for RAG.`);
            }
          }
        } else {
          // If no specific document, query across all user's documents
          const queryVector = await generateEmbedding(message);
          const matches = await searchSimilarChunks({
            ownerId: socket.user.id,
            queryEmbedding: queryVector,
            limit: 3
          });

          if (matches.length > 0) {
            // Fetch document names
            const docIds = [...new Set(matches.map(m => m.document.toString()))];
            const docs = await Document.find({ _id: { $in: docIds } });
            const docMap = docs.reduce((acc, doc) => {
              acc[doc._id.toString()] = doc.name;
              return acc;
            }, {});

            contextText = matches.map(m => `[Doc: ${docMap[m.document.toString()] || 'Unknown'}, Chunk ${m.chunkIndex}]: ${m.textContent}`).join('\n\n');
            citations = matches.map(m => ({
              documentName: docMap[m.document.toString()] || 'Study Guide',
              chunkIndex: m.chunkIndex,
              snippet: m.textContent.substring(0, 120) + '...'
            }));
            console.log(`🔍 Retrieved ${matches.length} cross-document context chunks.`);
          }
        }

        // 2. Gemini Stream Session
        const stream = await getGeminiChatStream(chatHistory, contextText);

        if (!stream) {
          // Mock mode response streaming simulator
          streamMockResponse(socket, citations);
          return;
        }

        // Send back citations first
        socket.emit('chat-citations', citations);

        // Stream parts
        for await (const chunk of stream) {
          if (!socket.connected) {
            console.log(`🔌 Socket client disconnected during stream. Aborting stream for Socket ID: ${socket.id}`);
            break;
          }
          const text = typeof chunk === 'string' ? chunk : chunk.text();
          socket.emit('chat-chunk', text);
        }
        
        if (socket.connected) {
          socket.emit('chat-end');
          console.log(`✔️ Finished streaming AI response.`);
        } else {
          console.log(`🔌 Stream completed but client was already disconnected.`);
        }

      } catch (error) {
        console.error('Socket message streaming error:', error);
        socket.emit('chat-error', 'Gemini model error or connection timeout.');
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Student disconnected: Socket ID: ${socket.id}`);
    });
  });
};

/**
 * Stream a simulated mock response word-by-word
 */
const streamMockResponse = (socket, citations) => {
  const responseText = `👋 Hello! I am running in **Mock Mode** because no \`GEMINI_API_KEY\` was provided in the server environment configuration.

Based on the RAG vector search, here is what I found in your documents:
${citations.length > 0 ? citations.map(c => `* **${c.documentName}** (Chunk ${c.chunkIndex})`).join('\n') : '* No specific reference text matching this topic was found.'}

To experience actual AI reasoning, conversational context memory, and accurate explanations, please add your Google Gemini API key to the server's \`.env\` file. Feel free to ask me anything else, and I will do my best to simulate answers!`;

  socket.emit('chat-citations', citations);

  const words = responseText.split(' ');
  let i = 0;

  const intervalId = setInterval(() => {
    if (!socket.connected) {
      console.log(`🔌 Client disconnected during mock stream. Clearing interval.`);
      clearInterval(intervalId);
      return;
    }
    if (i < words.length) {
      socket.emit('chat-chunk', words[i] + ' ');
      i++;
    } else {
      clearInterval(intervalId);
      socket.emit('chat-end');
    }
  }, 40); // 40ms delay simulates fast streaming
};
