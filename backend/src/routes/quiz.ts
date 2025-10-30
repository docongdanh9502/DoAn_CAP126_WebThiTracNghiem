import express from 'express';
import {
  getQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz
} from '../controllers/quizController';
import { authenticate, authorize } from '../middleware/auth';
import { validateQuiz } from '../middleware/validation';

const router = express.Router();

// @route   GET /api/quizzes
// @desc    Get all quizzes
// @access  Private
router.get('/', authenticate, getQuizzes);

// @route   GET /api/quizzes/:id
// @desc    Get single quiz
// @access  Private
router.get('/:id', authenticate, getQuiz);

// @route   POST /api/quizzes
// @desc    Create new quiz
// @access  Private (Teacher/Admin)
router.post('/', authenticate, authorize('teacher'), validateQuiz, createQuiz);

// @route   PUT /api/quizzes/:id
// @desc    Update quiz
// @access  Private (Teacher/Admin)
router.put('/:id', authenticate, authorize('teacher'), validateQuiz, updateQuiz);

// @route   DELETE /api/quizzes/:id
// @desc    Delete quiz
// @access  Private (Teacher/Admin)
router.delete('/:id', authenticate, authorize('teacher'), deleteQuiz);

export default router;