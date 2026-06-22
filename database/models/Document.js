import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  subject: {
    type: String,
    trim: true,
  },
  path: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
  },
  error: {
    type: String,
  },
  conceptCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true
});

const Document = mongoose.model('Document', documentSchema);
export default Document;
