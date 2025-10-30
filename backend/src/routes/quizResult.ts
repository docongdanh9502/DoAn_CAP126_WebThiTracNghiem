import express from 'express';
import {
  checkQuizCompletion,
  submitQuizResult,
  getStudentQuizResults,
  getQuizResults,
  getMyResultsSummary
} from '../controllers/quizResultController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// @route   GET /api/quiz-results/:quizId/check
// @desc    Check if student already completed a quiz
// @access  Private (Student)
router.get('/:quizId/check', authenticate, checkQuizCompletion);

// @route   POST /api/quiz-results
// @desc    Submit quiz result
// @access  Private (Student)
router.post('/', authenticate, submitQuizResult);

// @route   GET /api/quiz-results
// @desc    Get student's quiz results
// @access  Private (Student)
router.get('/', authenticate, getStudentQuizResults);

// @route   GET /api/quiz-results/quiz/:quizId
// @desc    Get quiz results for a specific quiz (for teachers)
// @access  Private (Teacher/Admin)
router.get('/quiz/:quizId', authenticate, authorize('teacher', 'admin'), getQuizResults);

// Teacher summary
router.get('/summary/my', authenticate, authorize('teacher'), getMyResultsSummary);

export default router;
