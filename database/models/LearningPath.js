import mongoose from 'mongoose';

const learningPathStepSchema = new mongoose.Schema({
  nodeId: { type: String, required: true },
  label: { type: String, required: true },
  description: String,
  order: { type: Number, required: true }
});

const learningPathSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subject: {
    type: String,
    required: true, // e.g. "DBMS", "Operating Systems"
  },
  steps: [learningPathStepSchema],
  completedSteps: [String], // array of nodeIds
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true
});

learningPathSchema.index({ owner: 1, subject: 1 });

const LearningPath = mongoose.model('LearningPath', learningPathSchema);
export default LearningPath;
