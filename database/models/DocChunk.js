import mongoose from 'mongoose';

const docChunkSchema = new mongoose.Schema({
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
  chunkIndex: {
    type: Number,
    required: true,
  },
  textContent: {
    type: String,
    required: true,
  },
  embedding: {
    type: [Number],
    required: true,
  }
}, {
  timestamps: true
});

// Create index for document queries
docChunkSchema.index({ document: 1 });

const DocChunk = mongoose.model('DocChunk', docChunkSchema);
export default DocChunk;
