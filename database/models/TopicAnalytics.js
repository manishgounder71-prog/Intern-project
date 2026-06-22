import mongoose from 'mongoose';

const topicAnalyticsSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  conceptLabel: {
    type: String,
    required: true, // e.g. "SQL", "AVL Tree"
  },
  graphNode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GraphNode'
  },
  quizAttempts: {
    type: Number,
    default: 0,
  },
  quizCorrectAnswers: {
    type: Number,
    default: 0,
  },
  flashcardsReviewed: {
    type: Number,
    default: 0,
  },
  flashcardsCorrect: {
    type: Number,
    default: 0,
  },
  chatMentions: {
    type: Number,
    default: 0,
  },
  lastStudiedAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true
});

topicAnalyticsSchema.index({ owner: 1, conceptLabel: 1 }, { unique: true });

const TopicAnalytics = mongoose.model('TopicAnalytics', topicAnalyticsSchema);
export default TopicAnalytics;
