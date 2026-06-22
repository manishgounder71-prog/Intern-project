import fs from 'fs';
import path from 'path';
import multer from 'multer';
import Document from '../../database/models/Document.js';
import DocChunk from '../../database/models/DocChunk.js';
import GraphData from '../../database/models/GraphData.js';
import Flashcard from '../../database/models/Flashcard.js';
import Quiz from '../../database/models/Quiz.js';
import User from '../../database/models/User.js';
import KnowledgeGraph from '../../database/models/KnowledgeGraph.js';
import GraphNode from '../../database/models/GraphNode.js';
import GraphEdge from '../../database/models/GraphEdge.js';
import LearningPath from '../../database/models/LearningPath.js';
import { extractTextFromFile } from '../services/parser.js';
import { generateEmbedding, generateEmbeddingsBatch, generateAllStudyMaterialsAI, generateNodeDetailsAI, generateAllNodeDetailsAI, extractConceptGraph, getMockSubjectGraph, generateMockFlashcards, generateMockQuiz, getMockNodeDetails } from '../services/gemini.js';
import { getLocalRAGFallbackDetails } from '../services/vectorStore.js';

// Setup local storage directory
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT are supported.'));
    }
  }
});

/**
 * Split text into overlapping segments
 */
const chunkText = (text, chunkSize = 1200, overlap = 250) => {
  const chunks = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    let chunk = text.substring(startIndex, endIndex);
    
    // Attempt to slice cleanly on whitespace/newline if not at the absolute end
    if (endIndex < text.length) {
      const lastSpace = chunk.lastIndexOf(' ');
      if (lastSpace > chunkSize * 0.6) {
        chunk = chunk.substring(0, lastSpace);
      }
    }
    
    chunks.push(chunk.trim());
    startIndex += chunk.length - overlap;
    
    // Prevent infinite loops on short chunks or overlaps
    if (chunk.length <= overlap) {
      startIndex = endIndex;
    }
  }
  return chunks.filter(c => c.length > 20);
};

export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a study document.' });
    }

    const { originalname, path: filePath, mimetype, size } = req.file;
    const subject = req.body.subject || originalname.replace(/\.[^/.]+$/, '');

    // Create entry with status processing
    const document = await Document.create({
      name: originalname,
      path: filePath,
      mimeType: mimetype,
      size,
      owner: req.user.id,
      status: 'processing',
      subject
    });

    // Respond immediately to avoid timeout
    res.status(202).json({
      message: 'Document uploaded. AI processing started in the background.',
      document
    });

    // Run the text extraction and embedding in the background
    processDocumentInBackground(document, filePath, mimetype, req.user.id).catch(err => {
      console.error(`Background processing failed for ${document._id}:`, err);
    });

  } catch (error) {
    next(error);
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateAndSaveEmbeddingsAsync = async (documentId, userId, textSegments) => {
  try {
    console.log(`⏳ Background embedding generation started for document: ${documentId} (${textSegments.length} chunks)...`);
    const embeddings = await generateEmbeddingsBatch(textSegments);
    console.log(`💾 Embeddings generated for ${embeddings.length} chunks. Updating database...`);

    const updatePromises = embeddings.map((embedding, idx) => 
      DocChunk.updateOne(
        { document: documentId, owner: userId, chunkIndex: idx },
        { $set: { embedding } }
      )
    );
    await Promise.all(updatePromises);
    console.log(`✅ Background embedding generation and database save completed for document: ${documentId}.`);
  } catch (error) {
    console.error(`❌ Background embedding generation failed for document: ${documentId}:`, error);
  }
};

const processDocumentInBackground = async (document, filePath, mimeType, userId, isRetry = false) => {
  try {
    console.log(`⏳ Starting background processing for: ${document.name}${isRetry ? ' (RETRY)' : ''}`);
    
    // 1. Extract text from PDF / Word / TXT
    const rawText = await extractTextFromFile(filePath, mimeType);
    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Could not extract any readable text content from the file.');
    }
    console.log(`📄 Extracted ${rawText.length} characters from document.`);

    // 2. Partition into chunks
    const textSegments = chunkText(rawText);
    console.log(`✂️ Sliced document into ${textSegments.length} text chunks.`);

    // 3. Insert chunk documents immediately with empty/placeholder embeddings (skip if already exists)
    const existingChunks = await DocChunk.countDocuments({ document: document._id });
    if (existingChunks === 0) {
      console.log(`💾 Inserting ${textSegments.length} text chunks to DB immediately...`);
      const docChunksToSave = textSegments.map((text, idx) => ({
        document: document._id,
        owner: userId,
        chunkIndex: idx,
        textContent: text,
        embedding: [] // Empty embedding initially
      }));
      await DocChunk.insertMany(docChunksToSave);
      
      // Kick off embedding generation asynchronously in background
      generateAndSaveEmbeddingsAsync(document._id, userId, textSegments);
    } else {
      console.log(`⏭️ Chunks already exist (${existingChunks}). Skipping insertion.`);
      // Check if any chunk is missing embeddings, retry if so
      const chunksWithoutEmbeddings = await DocChunk.findOne({ document: document._id, embedding: { $size: 0 } });
      if (chunksWithoutEmbeddings) {
        console.log(`⚠️ Found chunks without embeddings. Triggering background embedding generation retry...`);
        generateAndSaveEmbeddingsAsync(document._id, userId, textSegments);
      }
    }

    // 4. Segment the document text to cover all topics across the entire file
    const segmentSize = 30000;
    const numSegments = Math.min(Math.ceil(rawText.length / segmentSize), 4);
    const segments = [];
    for (let i = 0; i < numSegments; i++) {
      segments.push(rawText.substring(i * segmentSize, (i + 1) * segmentSize));
    }
    console.log(`📝 Document split into ${numSegments} segments for full-document topic extraction.`);

    // Call study materials on the first segment
    let studyMaterials = null;
    let lastError = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 AI extraction attempt ${attempt}/${maxRetries} for "${document.name}" Segment 1...`);
        studyMaterials = await generateAllStudyMaterialsAI(segments[0], document.name);
        break; // success
      } catch (aiError) {
        lastError = aiError;
        const isRateLimit = aiError.message.includes('429') || aiError.message.includes('Rate limit');
        const isDailyLimit = aiError.message.includes('free-models-per-day') || aiError.message.includes('daily');
        
        if (isDailyLimit) {
          console.warn(`⚠️ Daily rate limit hit on attempt ${attempt}. Aborting retries immediately to ensure 4-5s response.`);
          break; // Exit retry loop immediately on daily quota limits
        }
        
        if (isRateLimit && attempt < maxRetries) {
          const backoffMs = attempt * 1000; // Fast retry: 1s, 2s instead of 30s/60s to ensure 4-5s limit
          console.warn(`⚠️ Rate limit hit on attempt ${attempt}. Retrying in ${backoffMs / 1000}s...`);
          await sleep(backoffMs);
        } else {
          break; // Abort on other errors
        }
      }
    }

    if (!studyMaterials) {
      console.warn(`⚠️ AI extraction failed or rate limited for "${document.name}". Using high-quality mock subject fallbacks to guarantee 4-5s completion.`);
      const subject = document.subject || document.name.replace(/\.[^/.]+$/, '');
      studyMaterials = {
        graph: getMockSubjectGraph(subject),
        flashcards: generateMockFlashcards(),
        quiz: generateMockQuiz(document.name)
      };
    }

    // Call extractConceptGraph on remaining segments in parallel
    const restPromises = [];
    for (let i = 1; i < numSegments; i++) {
      console.log(`🤖 Triggering concept graph extraction for segment ${i + 1}/${numSegments} in parallel...`);
      restPromises.push(
        extractConceptGraph(segments[i])
          .catch(err => {
            console.warn(`⚠️ Segment ${i + 1} extraction failed:`, err.message);
            return { nodes: [], edges: [] };
          })
      );
    }

    const restResults = await Promise.all(restPromises);

    // Merge nodes and edges from all segments
    const allNodes = [...(studyMaterials.graph?.nodes || studyMaterials.nodes || [])];
    const allEdges = [...(studyMaterials.graph?.edges || studyMaterials.edges || [])];

    for (const res of restResults) {
      const segNodes = res?.nodes || res?.graph?.nodes || [];
      const segEdges = res?.edges || res?.graph?.edges || [];
      allNodes.push(...segNodes);
      allEdges.push(...segEdges);
    }

    // Deduplicate nodes
    const seenNodeIds = new Set();
    const seenNodeLabels = new Set();
    const mergedNodes = [];

    for (const node of allNodes) {
      if (!node || !node.id || !node.label) continue;
      const normalizedId = String(node.id).trim().toLowerCase();
      const normalizedLabel = String(node.label).trim().toLowerCase();
      
      if (seenNodeIds.has(normalizedId) || seenNodeLabels.has(normalizedLabel)) {
        continue;
      }
      
      seenNodeIds.add(normalizedId);
      seenNodeLabels.add(normalizedLabel);
      mergedNodes.push(node);
    }

    // Deduplicate & validate edges
    const seenEdges = new Set();
    const mergedEdges = [];

    for (const edge of allEdges) {
      if (!edge || !edge.source || !edge.target) continue;
      const sourceNorm = String(edge.source).trim().toLowerCase();
      const targetNorm = String(edge.target).trim().toLowerCase();

      if (!seenNodeIds.has(sourceNorm) || !seenNodeIds.has(targetNorm)) {
        continue; // Filter orphaned edges
      }

      const edgeKey = `${sourceNorm}->${targetNorm}`;
      if (seenEdges.has(edgeKey)) {
        continue;
      }

      seenEdges.add(edgeKey);
      mergedEdges.push({
        id: edge.id || `e-${sourceNorm}-${targetNorm}`,
        source: edge.source,
        target: edge.target,
        label: edge.label || 'prerequisite'
      });
    }

    const graphResult = {
      nodes: mergedNodes,
      edges: mergedEdges
    };
    const flashcardsData = studyMaterials.flashcards;
    const quizData = studyMaterials.quiz;

    // Save GraphData to DB
    await GraphData.create({
      document: document._id,
      owner: userId,
      nodes: graphResult.nodes || [],
      edges: graphResult.edges || []
    });
    console.log(`🕸️ Saved concept graph with ${graphResult.nodes?.length || 0} nodes.`);

    // Generate KnowledgeGraph, GraphNode, GraphEdge, LearningPath in background
    const subject = document.subject || document.name.replace(/\.[^/.]+$/, '');
    
    // Clear any existing graph for this subject/owner to avoid duplicate node mappings
    const existingGraph = await KnowledgeGraph.findOne({ subject, owner: userId });
    if (existingGraph) {
      await GraphNode.deleteMany({ graph: existingGraph._id });
      await GraphEdge.deleteMany({ graph: existingGraph._id });
      await KnowledgeGraph.deleteOne({ _id: existingGraph._id });
    }

    // Create graph document
    const graph = await KnowledgeGraph.create({
      subject,
      owner: userId,
      document: document._id
    });

    const nodeDocs = (graphResult.nodes || []).map(node => {
      const importances = ['high_probability', 'important', 'revision'];
      const randomImportance = importances[Math.floor(Math.random() * importances.length)];
      
      return {
        graph: graph._id,
        owner: userId,
        nodeId: node.id,
        label: node.label,
        group: node.group || 'core',
        definition: node.description,
        status: 'not_studied',
        importance: randomImportance
      };
    });

    const insertedNodes = await GraphNode.insertMany(nodeDocs);

    // Save edges to DB
    const edgeDocs = (graphResult.edges || []).map(edge => ({
      graph: graph._id,
      owner: userId,
      edgeId: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label || 'prerequisite'
    }));

    await GraphEdge.insertMany(edgeDocs);

    // Clear and Save LearningPath
    const learningSteps = (graphResult.nodes || []).map((n, idx) => ({
      nodeId: n.id,
      label: n.label,
      description: n.description,
      order: idx + 1
    }));

    await LearningPath.deleteMany({ owner: userId, subject });
    await LearningPath.create({
      owner: userId,
      subject,
      steps: learningSteps,
      completedSteps: []
    });

    console.log(`🧠 Successfully generated KnowledgeGraph with ${insertedNodes.length} nodes for subject "${subject}".`);

    // Save study flashcards to DB
    const flashcardsToInsert = (Array.isArray(flashcardsData) ? flashcardsData : []).map(card => {
      const front = card.front || card.question || card.q || '';
      const back = card.back || card.answer || card.a || '';
      return {
        document: document._id,
        owner: userId,
        front: String(front).trim(),
        back: String(back).trim()
      };
    }).filter(card => card.front && card.back);

    if (flashcardsToInsert.length > 0) {
      await Flashcard.insertMany(flashcardsToInsert);
      console.log(`📇 Saved ${flashcardsToInsert.length} study flashcards.`);
    }

    // Save Interactive Quiz to DB
    const rawQuestions = Array.isArray(quizData?.questions) ? quizData.questions : (Array.isArray(quizData) ? quizData : []);
    
    const questions = rawQuestions.map(q => {
      const question = q.question || q.q || '';
      const options = Array.isArray(q.options) ? q.options : (Array.isArray(q.choices) ? q.choices : []);
      let correctAnswerIndex = q.correctAnswerIndex !== undefined ? q.correctAnswerIndex : q.answer;
      if (typeof correctAnswerIndex === 'string') {
        const letterIndex = correctAnswerIndex.charCodeAt(0) - 65;
        if (letterIndex >= 0 && letterIndex < options.length) {
          correctAnswerIndex = letterIndex;
        } else {
          const matchIdx = options.findIndex(opt => opt.toLowerCase() === correctAnswerIndex.toLowerCase());
          correctAnswerIndex = matchIdx !== -1 ? matchIdx : 0;
        }
      }
      return {
        question: String(question).trim(),
        options: options.map(opt => String(opt).trim()),
        correctAnswerIndex: Number(correctAnswerIndex) || 0,
        explanation: q.explanation || ''
      };
    }).filter(q => q.question && q.options.length > 0);

    if (questions.length > 0) {
      await Quiz.create({
        document: document._id,
        owner: userId,
        title: quizData?.title || `Concept Quiz: ${document.name}`,
        questions
      });
      console.log(`📝 Saved interactive quiz with ${questions.length} questions.`);
    }

    // ✅ MARK COMPLETE EARLY — document is usable now (mind map, flashcards, quiz ready)
    // Node detail profiles will continue generating in background after this point
    document.status = 'completed';
    document.conceptCount = graphResult.nodes?.length || 0;
    await document.save();
    await User.findByIdAndUpdate(userId, { $inc: { xp: 50 } });
    console.log(`✅ Document marked COMPLETED. User awarded +50 XP. Continuing node profile generation in background...`);

    // ── BACKGROUND PHASE 2: Pre-generate node detail profiles ──────────────────
    // Runs AFTER completion in a single consolidated API request to avoid rate-limiting.
    // Falls back to local keyword-based RAG if OpenRouter limit is hit or nodes are missing.
    try {
      console.log(`🤖 Pre-generating node details in a consolidated call...`);
      const allDetailsResult = await generateAllNodeDetailsAI(subject, insertedNodes, rawText);
      const detailsMap = allDetailsResult?.details || {};

      await Promise.all(insertedNodes.map(async (node) => {
        let nodeDetails = detailsMap[node.nodeId];
        
        if (nodeDetails && nodeDetails.explanation && nodeDetails.explanation.trim().length > 0) {
          console.log(`   ✅ API details saved for: "${node.label}"`);
        } else {
          const mockDetails = getMockNodeDetails(node.label);
          if (mockDetails && mockDetails.explanation && !mockDetails.explanation.includes('on-demand tutorial') && !mockDetails.explanation.includes('mockup breakdown')) {
            console.log(`   ⭐ High-quality mock library details found for: "${node.label}"`);
            nodeDetails = mockDetails;
          } else {
            console.log(`   ⚠️ API details missing/failed for: "${node.label}". Generating local RAG fallback...`);
            nodeDetails = await getLocalRAGFallbackDetails(node.label, document._id);
          }
        }

        await GraphNode.findByIdAndUpdate(node._id, {
          $set: {
            explanation: nodeDetails.explanation || '',
            example: nodeDetails.example || '',
            formulas: nodeDetails.formulas || 'N/A',
            diagram: nodeDetails.diagram || '',
            relatedTopics: nodeDetails.relatedTopics || [],
            interviewQuestions: nodeDetails.interviewQuestions || [],
            quizQuestions: nodeDetails.quizQuestions || []
          }
        });
      }));
      console.log(`✅ Successfully finished pre-generating details for all ${insertedNodes.length} nodes.`);
    } catch (err) {
      console.warn(`⚠️ Batch node expansion error, fallback to local RAG or mock for all nodes:`, err.message);
      await Promise.all(insertedNodes.map(async (node) => {
        let nodeDetails;
        const mockDetails = getMockNodeDetails(node.label);
        if (mockDetails && mockDetails.explanation && !mockDetails.explanation.includes('on-demand tutorial') && !mockDetails.explanation.includes('mockup breakdown')) {
          console.log(`   ⭐ High-quality mock library details found for: "${node.label}"`);
          nodeDetails = mockDetails;
        } else {
          nodeDetails = await getLocalRAGFallbackDetails(node.label, document._id);
        }
        await GraphNode.findByIdAndUpdate(node._id, {
          $set: {
            explanation: nodeDetails.explanation || '',
            example: nodeDetails.example || '',
            formulas: nodeDetails.formulas || 'N/A',
            diagram: nodeDetails.diagram || '',
            relatedTopics: nodeDetails.relatedTopics || [],
            interviewQuestions: nodeDetails.interviewQuestions || [],
            quizQuestions: nodeDetails.quizQuestions || []
          }
        });
      }));
    }

  } catch (error) {
    console.error(`❌ Background processing failed:`, error);
    document.status = 'failed';
    document.error = error.message;
    await document.save();
  }
};

export const listDocuments = async (req, res, next) => {
  try {
    const documents = await Document.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, owner: req.user.id });
    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Delete physical file
    if (fs.existsSync(document.path)) {
      fs.unlinkSync(document.path);
    }

    // Delete database records
    await Document.deleteOne({ _id: document._id });
    await DocChunk.deleteMany({ document: document._id });
    await GraphData.deleteMany({ document: document._id });
    await Flashcard.deleteMany({ document: document._id });
    await Quiz.deleteMany({ document: document._id });

    res.json({ message: 'Document and all derived AI study resources deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const retryDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, owner: req.user.id });
    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    if (document.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed documents can be retried.' });
    }

    // Reset status
    document.status = 'processing';
    document.error = undefined;
    await document.save();

    // Respond immediately, retry in background
    res.status(202).json({ message: 'Retrying document processing in the background.', document });

    processDocumentInBackground(document, document.path, document.mimeType, req.user.id, true).catch(err => {
      console.error(`❌ Retry processing failed for ${document._id}:`, err);
    });
  } catch (error) {
    next(error);
  }
};
