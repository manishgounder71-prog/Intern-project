import mongoose from 'mongoose';

const graphMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const graphChatHistorySchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  messages: [graphMessageSchema]
}, {
  timestamps: true
});

graphChatHistorySchema.index({ owner: 1, subject: 1 });

const GraphChatHistory = mongoose.model('GraphChatHistory', graphChatHistorySchema);
export default GraphChatHistory;
