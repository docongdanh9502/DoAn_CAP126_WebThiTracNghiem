import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth';
import {
  getAssignedQuizzes,
  getAssignments,
  assignQuiz,
  updateAssignment,
  deleteAssignment
} from '../controllers/assignmentController';

const router = express.Router();

// Validation rules
const validateAssignQuiz = [
  body('quizId').notEmpty().withMessage('Quiz ID là bắt buộc'),
  body('assignedTo').isArray({ min: 1 }).withMessage('Phải có ít nhất 1 sinh viên'),
  body('assignedTo.*').isEmail().withMessage('Email không hợp lệ'),
  body('dueDate').isISO8601().withMessage('Ngày hạn nộp không hợp lệ')
];

const validateUpdateAssignment = [
  body('assignedTo').optional().isArray().withMessage('Danh sách sinh viên không hợp lệ'),
  body('assignedTo.*').optional().isEmail().withMessage('Email không hợp lệ'),
  body('dueDate').optional().isISO8601().withMessage('Ngày hạn nộp không hợp lệ')
];

// Routes
router.get('/assigned-to-me', authenticate, getAssignedQuizzes);
router.get('/', authenticate, getAssignments);
router.post('/', authenticate, validateAssignQuiz, assignQuiz);
router.put('/:id', authenticate, validateUpdateAssignment, updateAssignment);
router.delete('/:id', authenticate, deleteAssignment);

export default router;
