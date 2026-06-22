import mongoose from 'mongoose';

const flashcardSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  front: {
    type: String,
    required: true,
  },
  back: {
    type: String,
    required: true,
  },
  // Spaced Repetition parameters (SuperMemo SM-2 simplified or standard Box-based)
  interval: {
    type: Number,
    default: 1, // in days
  },
  repetition: {
    type: Number,
    default: 0, // consecutive successful repetitions
  },
  efactor: {
    type: Number,
    default: 2.5, // ease factor
  },
  nextReviewDate: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true
});

// Indexes for query speed
flashcardSchema.index({ owner: 1, nextReviewDate: 1 });
flashcardSchema.index({ document: 1 });

const Flashcard = mongoose.model('Flashcard', flashcardSchema);
export default Flashcard;
