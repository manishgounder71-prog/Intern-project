import express from 'express';
import * as authController from '../controllers/authController.js';
import * as docController from '../controllers/docController.js';
import * as studyController from '../controllers/studyController.js';
import * as graphController from '../controllers/graphController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/profile', requireAuth, authController.getProfile);

// ==========================================
// DOCUMENT & LIBRARY ROUTES
// ==========================================
router.post('/docs/upload', requireAuth, docController.upload.single('file'), docController.uploadDocument);
router.get('/docs', requireAuth, docController.listDocuments);
router.delete('/docs/:id', requireAuth, docController.deleteDocument);
router.post('/docs/:id/retry', requireAuth, docController.retryDocument);

// ==========================================
// STUDY ACTIVITIES (FLASHCARDS, QUIZZES, GLOBAL MIND MAP)
// ==========================================
router.get('/study/flashcards', requireAuth, studyController.getFlashcards);
router.get('/study/flashcards/due', requireAuth, studyController.getDueFlashcards);
router.post('/study/flashcards/:id/review', requireAuth, studyController.reviewFlashcard);

router.get('/study/quizzes', requireAuth, studyController.getQuizzes);
router.get('/study/quizzes/:id', requireAuth, studyController.getQuizDetails);
router.post('/study/quizzes/:id/submit', requireAuth, studyController.submitQuizAttempt);

router.get('/study/graph', requireAuth, studyController.getGraphData);

// ==========================================
// AI KNOWLEDGE GRAPH MODULE ROUTES
// ==========================================
router.post('/graph/generate', requireAuth, graphController.generateGraph);
router.get('/graph/analytics', requireAuth, graphController.getAnalytics);
router.get('/graph/recommendations', requireAuth, graphController.getRecommendations);
router.get('/graph/node/:id', requireAuth, graphController.getNodeDetails);
router.post('/graph/chat', requireAuth, graphController.graphChat);
router.get('/graph/:subject', requireAuth, graphController.getGraphBySubject);

export default router;
