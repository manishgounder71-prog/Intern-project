import mongoose from 'mongoose';

const nodeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  group: {
    type: String,
    default: 'general',
  }
});

const edgeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    required: true, // source node ID
  },
  target: {
    type: String,
    required: true, // target node ID
  },
  label: {
    type: String,
    default: 'relates to',
  }
});

const graphDataSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  nodes: [nodeSchema],
  edges: [edgeSchema]
}, {
  timestamps: true
});

graphDataSchema.index({ document: 1 });
graphDataSchema.index({ owner: 1 });

const GraphData = mongoose.model('GraphData', graphDataSchema);
export default GraphData;
