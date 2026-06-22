import mongoose from 'mongoose';

const knowledgeGraphSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true, // e.g. "DBMS", "Operating Systems", "Algorithms"
    trim: true,
  },
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true
});

knowledgeGraphSchema.index({ owner: 1, subject: 1 });

const KnowledgeGraph = mongoose.model('KnowledgeGraph', knowledgeGraphSchema);
export default KnowledgeGraph;
