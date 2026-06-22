import mongoose from 'mongoose';

const weakTopicSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  conceptLabel: {
    type: String,
    required: true,
  },
  nodeId: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  scoreRatio: {
    type: Number, // correct/attempts
    default: 0,
  },
  flaggedReason: {
    type: String, // e.g. "Low quiz performance", "Failed flashcard recalls"
    default: 'Low score'
  }
}, {
  timestamps: true
});

weakTopicSchema.index({ owner: 1, nodeId: 1 }, { unique: true });

const WeakTopic = mongoose.model('WeakTopic', weakTopicSchema);
export default WeakTopic;
