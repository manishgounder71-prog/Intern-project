import mongoose from 'mongoose';

const interviewQuestionSchema = new mongoose.Schema({
  question: String,
  answer: String
});

const nodeQuizQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswerIndex: { type: Number, required: true },
  explanation: String
});

const graphNodeSchema = new mongoose.Schema({
  graph: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgeGraph',
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  nodeId: {
    type: String,
    required: true, // React Flow ID (e.g. "sql")
  },
  label: {
    type: String,
    required: true, // Display title (e.g. "Structured Query Language")
  },
  group: {
    type: String,
    default: 'core', // 'core', 'advanced', 'related'
  },
  definition: {
    type: String,
  },
  explanation: {
    type: String,
  },
  example: {
    type: String,
  },
  formulas: {
    type: String, // math/formulas text
  },
  diagram: {
    type: String, // Mermaid diagram syntax
  },
  relatedTopics: [String],
  interviewQuestions: [interviewQuestionSchema],
  quizQuestions: [nodeQuizQuestionSchema],
  
  // Dynamic learning status metrics
  status: {
    type: String,
    enum: ['not_studied', 'studying', 'weak', 'strong'],
    default: 'not_studied',
  },
  importance: {
    type: String,
    enum: ['high_probability', 'important', 'revision'],
    default: 'important',
  }
}, {
  timestamps: true
});

graphNodeSchema.index({ graph: 1, nodeId: 1 }, { unique: true });
graphNodeSchema.index({ owner: 1 });

const GraphNode = mongoose.model('GraphNode', graphNodeSchema);
export default GraphNode;
