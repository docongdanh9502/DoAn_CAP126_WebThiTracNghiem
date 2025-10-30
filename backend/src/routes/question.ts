import express from 'express';
import {
  getQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionStats
} from '../controllers/questionController';
import { authenticate, authorize } from '../middleware/auth';
import { validateQuestion } from '../middleware/validation';

const router = express.Router();

// @route   GET /api/questions
// @desc    Get all questions
// @access  Private
router.get('/', authenticate, getQuestions);

// @route   GET /api/questions/stats
// @desc    Get question statistics
// @access  Private (Teacher/Admin)
router.get('/stats', authenticate, authorize('teacher'), getQuestionStats);

// @route   GET /api/questions/:id
// @desc    Get single question
// @access  Private
router.get('/:id', authenticate, getQuestion);

// @route   POST /api/questions
// @desc    Create new question
// @access  Private (Teacher/Admin)
router.post('/', authenticate, authorize('teacher'), validateQuestion, createQuestion);

// @route   PUT /api/questions/:id
// @desc    Update question
// @access  Private (Teacher/Admin)
router.put('/:id', authenticate, authorize('teacher'), validateQuestion, updateQuestion);

// @route   DELETE /api/questions/:id
// @desc    Delete question
// @access  Private (Teacher/Admin)
router.delete('/:id', authenticate, authorize('teacher'), deleteQuestion);

export default router;