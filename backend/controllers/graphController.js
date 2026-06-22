import KnowledgeGraph from '../../database/models/KnowledgeGraph.js';
import GraphNode from '../../database/models/GraphNode.js';
import GraphEdge from '../../database/models/GraphEdge.js';
import TopicAnalytics from '../../database/models/TopicAnalytics.js';
import LearningPath from '../../database/models/LearningPath.js';
import WeakTopic from '../../database/models/WeakTopic.js';
import GraphChatHistory from '../../database/models/GraphChatHistory.js';
import {
  generateNodeDetailsAI,
  generateSubjectGraphAI,
  generateGraphChatAI,
  getMockNodeDetails
} from '../services/gemini.js';
import { getLocalRAGFallbackDetails } from '../services/vectorStore.js';

// ==========================================
// CONTROLLER ACTIONS
// ==========================================

export const generateGraph = async (req, res, next) => {
  try {
    const { subject, text } = req.body;

    if (!subject || !text) {
      return res.status(400).json({ error: 'Please provide both a subject title and study content text.' });
    }

    // Delete existing graph for this subject/owner to avoid duplicate node mappings
    const existingGraph = await KnowledgeGraph.findOne({ subject, owner: req.user.id });
    if (existingGraph) {
      await GraphNode.deleteMany({ graph: existingGraph._id });
      await GraphEdge.deleteMany({ graph: existingGraph._id });
      await KnowledgeGraph.deleteOne({ _id: existingGraph._id });
    }

    // Create graph document
    const graph = await KnowledgeGraph.create({
      subject,
      owner: req.user.id
    });

    // Call AI to get base graph structure
    const nodesAndEdges = await generateSubjectGraphAI(subject, text);

    // Save nodes to DB
    const savedNodes = [];
    const nodeMapping = {}; // mapping local React Flow ids to DB document ids

    const nodeDocs = (nodesAndEdges.nodes || []).map(node => {
      // Pick dynamic status/importance
      const importances = ['high_probability', 'important', 'revision'];
      const randomImportance = importances[Math.floor(Math.random() * importances.length)];
      
      return {
        graph: graph._id,
        owner: req.user.id,
        nodeId: node.id,
        label: node.label,
        group: node.group || 'core',
        definition: node.description,
        status: 'not_studied',
        importance: randomImportance
      };
    });

    const insertedNodes = await GraphNode.insertMany(nodeDocs);
    insertedNodes.forEach(doc => {
      nodeMapping[doc.nodeId] = doc._id;
    });

    // Save edges to DB
    const edgeDocs = (nodesAndEdges.edges || []).map(edge => ({
      graph: graph._id,
      owner: req.user.id,
      edgeId: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label || 'prerequisite'
    }));

    await GraphEdge.insertMany(edgeDocs);

    // Generate initial Learning Path steps from the edges (topological sort mockup)
    const learningSteps = (nodesAndEdges.nodes || []).map((n, idx) => ({
      nodeId: n.id,
      label: n.label,
      description: n.description,
      order: idx + 1
    }));

    await LearningPath.create({
      owner: req.user.id,
      subject,
      steps: learningSteps,
      completedSteps: []
    });

    res.status(201).json({
      message: 'Knowledge graph successfully generated.',
      graphId: graph._id,
      nodes: insertedNodes,
      edges: edgeDocs
    });

  } catch (error) {
    next(error);
  }
};

export const getGraphBySubject = async (req, res, next) => {
  try {
    const { subject } = req.params;
    const graph = await KnowledgeGraph.findOne({ subject, owner: req.user.id });

    if (!graph) {
      return res.status(404).json({ error: `No knowledge graph found for the subject: ${subject}` });
    }

    const nodes = await GraphNode.find({ graph: graph._id });
    const edges = await GraphEdge.find({ graph: graph._id });

    res.json({
      graph,
      nodes,
      edges
    });
  } catch (error) {
    next(error);
  }
};

export const getNodeDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const node = await GraphNode.findOne({ _id: id, owner: req.user.id });

    if (!node) {
      return res.status(404).json({ error: 'Concept node not found.' });
    }

    // If profile is already pre-generated, return instantly from DB
    if (node.explanation && node.explanation.trim().length > 0 && !node.explanation.includes('mockup breakdown') && !node.explanation.includes('OpenRouter API key')) {
      return res.json(node);
    }

    // Profile not ready yet (still being generated in background) — generate on-demand and cache
    console.log(`⚡ On-demand profile for "${node.label}" (pre-generation still in progress or fallback required)...`);
    const graph = await KnowledgeGraph.findById(node.graph);
    
    let details;
    try {
      details = await generateNodeDetailsAI(graph?.subject || 'General Study', node.label);
      if (!details || details.explanation?.includes('mockup breakdown') || details.explanation?.includes('OpenRouter API key')) {
        throw new Error('API returned mock fallback.');
      }
    } catch (err) {
      console.log(`⚡ On-demand AI call failed or returned mock. Using local RAG fallback for "${node.label}"...`);
      const mockDetails = getMockNodeDetails(node.label);
      if (mockDetails && mockDetails.explanation && !mockDetails.explanation.includes('mockup breakdown') && !mockDetails.explanation.includes('OpenRouter API key')) {
        details = mockDetails;
      } else if (graph && graph.document) {
        details = await getLocalRAGFallbackDetails(node.label, graph.document);
      } else {
        // Fallback to basic details if document is not found
        details = {
          explanation: `Please refer to the study material for more details on ${node.label}.`,
          example: 'N/A',
          formulas: 'N/A',
          diagram: `graph TD\n  A[${node.label}] --> B(Explore Subtopics)\n  A --> C(Study Examples)\n  A --> D(Test Knowledge)`,
          relatedTopics: [],
          interviewQuestions: []
        };
      }
    }

    node.explanation = details.explanation || '';
    node.example = details.example || '';
    node.formulas = details.formulas || 'N/A';
    node.diagram = details.diagram || '';
    node.relatedTopics = details.relatedTopics || [];
    node.interviewQuestions = details.interviewQuestions || [];
    node.quizQuestions = details.quizQuestions || [];
    await node.save();

    res.json(node);
  } catch (error) {
    next(error);
  }
};

export const graphChat = async (req, res, next) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required fields.' });
    }

    // Retrieve graph context
    const graph = await KnowledgeGraph.findOne({ subject, owner: req.user.id });
    if (!graph) {
      return res.status(404).json({ error: `Graph context for ${subject} not found.` });
    }

    const nodes = await GraphNode.find({ graph: graph._id }).select('nodeId label definition group status importance');
    const edges = await GraphEdge.find({ graph: graph._id }).select('source target label');

    const graphContext = {
      nodes: nodes.map(n => ({ id: n.nodeId, label: n.label, description: n.definition, group: n.group, status: n.status, importance: n.importance })),
      edges: edges.map(e => ({ from: e.source, to: e.target, type: e.label }))
    };

    // Retrieve past history or create a new session
    let chatSession = await GraphChatHistory.findOne({ owner: req.user.id, subject });
    if (!chatSession) {
      chatSession = await GraphChatHistory.create({
        owner: req.user.id,
        subject,
        messages: []
      });
    }

    const responseText = await generateGraphChatAI(subject, graphContext, chatSession, message);

    // Save history
    chatSession.messages.push({ role: 'user', content: message });
    chatSession.messages.push({ role: 'assistant', content: responseText });
    await chatSession.save();

    res.json({
      response: responseText,
      history: chatSession.messages
    });

  } catch (error) {
    next(error);
  }
};

export const getAnalytics = async (req, res, next) => {
  try {
    const { subject } = req.query;

    const query = { owner: req.user.id };
    if (subject) {
      const graph = await KnowledgeGraph.findOne({ subject, owner: req.user.id });
      if (graph) {
        query.graph = graph._id;
      }
    }

    const nodes = await GraphNode.find(query);
    const edges = await GraphEdge.find(query);

    const totalConcepts = nodes.length;
    const totalConnections = edges.length;

    // Count states
    const strongTopicsCount = nodes.filter(n => n.status === 'strong').length;
    const weakTopicsCount = nodes.filter(n => n.status === 'weak').length;
    const studiedCount = nodes.filter(n => n.status !== 'not_studied').length;
    
    const progressPercent = totalConcepts > 0 ? Math.round((studiedCount / totalConcepts) * 100) : 0;

    // Find hubs (nodes with highest connections)
    const connectionCounts = {};
    edges.forEach(e => {
      connectionCounts[e.source] = (connectionCounts[e.source] || 0) + 1;
      connectionCounts[e.target] = (connectionCounts[e.target] || 0) + 1;
    });

    const mostConnected = Object.entries(connectionCounts)
      .map(([nodeId, count]) => {
        const found = nodes.find(n => n.nodeId === nodeId);
        return {
          nodeId,
          label: found ? found.label : nodeId,
          connections: count
        };
      })
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 5);

    res.json({
      totalConcepts,
      totalConnections,
      strongTopics: strongTopicsCount,
      weakTopics: weakTopicsCount,
      studyProgress: progressPercent,
      mostConnected
    });
  } catch (error) {
    next(error);
  }
};

export const getRecommendations = async (req, res, next) => {
  try {
    const { subject } = req.query;
    if (!subject) {
      return res.status(400).json({ error: 'Please provide a subject query parameter.' });
    }

    const graph = await KnowledgeGraph.findOne({ subject, owner: req.user.id });
    if (!graph) {
      return res.json({ recommendations: [], nextTopic: null });
    }

    const nodes = await GraphNode.find({ graph: graph._id });
    const edges = await GraphEdge.find({ graph: graph._id });

    // Recommendation logic:
    // 1. Identify weak nodes -> Revision recommended
    const weakNodes = nodes.filter(n => n.status === 'weak');
    
    // 2. Missing prerequisites: Find nodes that are not studied, but whose parent nodes/prereqs ARE studied
    // Let's model a basic traversal:
    const studiedNodeIds = new Set(nodes.filter(n => n.status === 'strong').map(n => n.nodeId));
    const nextOptions = [];

    nodes.forEach(n => {
      if (n.status === 'not_studied') {
        // Find if all prerequisites (incoming edges) are studied
        const incomingEdges = edges.filter(e => e.target === n.nodeId);
        const allPrereqsMet = incomingEdges.length > 0 && incomingEdges.every(e => studiedNodeIds.has(e.source));
        
        // Or if it has no prerequisites, it can be a start node
        if (incomingEdges.length === 0 || allPrereqsMet) {
          nextOptions.push(n);
        }
      }
    });

    const recommendations = [];

    // Add weak topics as high priority revision
    weakNodes.forEach(wn => {
      recommendations.push({
        type: 'revision',
        nodeId: wn.nodeId,
        label: wn.label,
        reason: '🔥 Marked as weak based on quiz/flashcard performance. Standard review recommended.'
      });
    });

    // Add next topics
    nextOptions.slice(0, 3).forEach(nt => {
      recommendations.push({
        type: 'next_topic',
        nodeId: nt.nodeId,
        label: nt.label,
        reason: '⭐ Prerequisites met. Ready to explore next concept.'
      });
    });

    // If nothing matches, recommend any unstudied core node
    if (recommendations.length === 0) {
      const unstudied = nodes.find(n => n.status === 'not_studied');
      if (unstudied) {
        recommendations.push({
          type: 'start',
          nodeId: unstudied.nodeId,
          label: unstudied.label,
          reason: '📖 Begin learning this foundational concept.'
        });
      }
    }

    res.json({
      recommendations,
      nextTopic: recommendations.find(r => r.type === 'next_topic') || recommendations[0] || null
    });

  } catch (error) {
    next(error);
  }
};

