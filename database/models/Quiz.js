import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    required: true,
  },
  correctAnswerIndex: {
    type: Number,
    required: true,
  },
  explanation: {
    type: String,
  }
});

const quizSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  questions: [questionSchema],
  attempts: [{
    score: {
      type: Number,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    answers: [Number], // option indexes selected by user
    completedAt: {
      type: Date,
      default: Date.now,
    }
  }]
}, {
  timestamps: true
});

quizSchema.index({ owner: 1 });
quizSchema.index({ document: 1 });

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
