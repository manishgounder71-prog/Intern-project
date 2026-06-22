import mongoose from 'mongoose';

const graphEdgeSchema = new mongoose.Schema({
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
  edgeId: {
    type: String,
    required: true, // React Flow ID (e.g., "e-dbms-sql")
  },
  source: {
    type: String,
    required: true, // Node ID (source)
  },
  target: {
    type: String,
    required: true, // Node ID (target)
  },
  label: {
    type: String,
    default: 'relates to', // Relationship type e.g., 'requires', 'defines'
  }
}, {
  timestamps: true
});

graphEdgeSchema.index({ graph: 1 });
graphEdgeSchema.index({ owner: 1 });

const GraphEdge = mongoose.model('GraphEdge', graphEdgeSchema);
export default GraphEdge;
