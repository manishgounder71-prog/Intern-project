import Flashcard from '../../database/models/Flashcard.js';
import Quiz from '../../database/models/Quiz.js';
import GraphData from '../../database/models/GraphData.js';
import User from '../../database/models/User.js';

/**
 * SuperMemo SM-2 Simplified Algorithm for Spaced Repetition
 * rating: 1 = Hard (Forgot/Incorrect), 3 = Medium (Slow recall), 5 = Easy (Perfect recall)
 */
const updateSRSCard = (card, rating) => {
  let { repetition, interval, efactor } = card;

  if (rating >= 3) {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 3;
    } else {
      interval = Math.round(interval * efactor);
    }
    repetition += 1;
  } else {
    repetition = 0;
    interval = 1;
  }

  // EF adjustment
  efactor = efactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  if (efactor < 1.3) efactor = 1.3;

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return { repetition, interval, efactor, nextReviewDate };
};

// ==========================================
// FLASHCARD CONTROLLERS
// ==========================================

export const getFlashcards = async (req, res, next) => {
  try {
    const { documentId } = req.query;
    const query = { owner: req.user.id };
    if (documentId) {
      query.document = documentId;
    }
    const flashcards = await Flashcard.find(query).sort({ createdAt: -1 });
    res.json(flashcards);
  } catch (error) {
    next(error);
  }
};

export const getDueFlashcards = async (req, res, next) => {
  try {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const flashcards = await Flashcard.find({
      owner: req.user.id,
      nextReviewDate: { $lte: todayEnd }
    }).sort({ nextReviewDate: 1 });

    res.json(flashcards);
  } catch (error) {
    next(error);
  }
};

export const reviewFlashcard = async (req, res, next) => {
  try {
    const { rating } = req.body; // 1, 3, or 5
    if (![1, 3, 5].includes(Number(rating))) {
      return res.status(400).json({ error: 'Rating must be 1 (Hard), 3 (Medium), or 5 (Easy).' });
    }

    const card = await Flashcard.findOne({ _id: req.params.id, owner: req.user.id });
    if (!card) {
      return res.status(404).json({ error: 'Flashcard not found.' });
    }

    const srsUpdates = updateSRSCard(card, Number(rating));
    card.repetition = srsUpdates.repetition;
    card.interval = srsUpdates.interval;
    card.efactor = srsUpdates.efactor;
    card.nextReviewDate = srsUpdates.nextReviewDate;

    await card.save();

    // Award user +10 XP for studying
    const xpReward = 10;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $inc: { xp: xpReward } },
      { new: true }
    );

    res.json({
      message: `Card reviewed! Awarded +${xpReward} XP.`,
      xp: user.xp,
      level: user.level,
      flashcard: card
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// QUIZ CONTROLLERS
// ==========================================

export const getQuizzes = async (req, res, next) => {
  try {
    const { documentId } = req.query;
    const query = { owner: req.user.id };
    if (documentId) {
      query.document = documentId;
    }
    const quizzes = await Quiz.find(query).sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (error) {
    next(error);
  }
};

export const getQuizDetails = async (req, res, next) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, owner: req.user.id });
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }
    res.json(quiz);
  } catch (error) {
    next(error);
  }
};

export const submitQuizAttempt = async (req, res, next) => {
  try {
    const { answers } = req.body; // array of option indexes
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Please provide answers as an array.' });
    }

    const quiz = await Quiz.findOne({ _id: req.params.id, owner: req.user.id });
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }

    if (answers.length !== quiz.questions.length) {
      return res.status(400).json({ error: 'Answers count does not match the quiz questions count.' });
    }

    // Grade attempt
    let score = 0;
    quiz.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswerIndex) {
        score += 1;
      }
    });

    const totalQuestions = quiz.questions.length;
    const attempt = {
      score,
      totalQuestions,
      answers,
      completedAt: new Date()
    };

    quiz.attempts.push(attempt);
    await quiz.save();

    // Award user XP based on percentage correct (e.g. 20XP base per correct answer!)
    const xpReward = score * 20;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $inc: { xp: xpReward } },
      { new: true }
    );

    res.json({
      message: `Quiz submitted! Score: ${score}/${totalQuestions}. Awarded +${xpReward} XP.`,
      xp: user.xp,
      attempt,
      quiz
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GRAPH CONTROLLERS
// ==========================================

export const getGraphData = async (req, res, next) => {
  try {
    const { documentId } = req.query;
    
    if (documentId) {
      const graph = await GraphData.findOne({ document: documentId, owner: req.user.id });
      return res.json(graph || { nodes: [], edges: [] });
    }

    // Otherwise, construct a global mind map by merging all graphs of the user!
    const graphs = await GraphData.find({ owner: req.user.id });
    
    const globalNodes = [];
    const globalEdges = [];
    const nodeIds = new Set();
    const edgeIds = new Set();

    graphs.forEach(g => {
      g.nodes.forEach(n => {
        if (!nodeIds.has(n.id)) {
          nodeIds.add(n.id);
          globalNodes.push(n);
        }
      });
      g.edges.forEach(e => {
        if (!edgeIds.has(e.id)) {
          edgeIds.add(e.id);
          globalEdges.push(e);
        }
      });
    });

    res.json({ nodes: globalNodes, edges: globalEdges });
  } catch (error) {
    next(error);
  }
};
