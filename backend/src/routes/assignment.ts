// ============================================
// FILE: assignment.ts
// MÔ TẢ: Routes cho quản lý Assignment (Giao bài thi)
// CHỨC NĂNG: Định nghĩa các endpoints cho assignment (Student xem bài được giao, Teacher giao bài)
// ============================================

import express from 'express'; // Express Router
import { body } from 'express-validator'; // Validation
import { authenticate } from '../middleware/auth'; // Middleware xác thực
import {
  getAssignedQuizzes,  // Controller: Lấy danh sách bài thi được giao (Student)
  getAssignments,       // Controller: Lấy danh sách assignments đã giao (Teacher)
  assignQuiz,          // Controller: Giao bài thi cho sinh viên (Teacher)
  updateAssignment,    // Controller: Cập nhật assignment
  deleteAssignment     // Controller: Xóa assignment
} from '../controllers/assignmentController';

const router = express.Router();

// ============================================
// VALIDATION RULES - Quy tắc validate
// ============================================

// Validation cho assignQuiz: quizId, assignedTo (array emails), dueDate (ISO8601)
const validateAssignQuiz = [
  body('quizId').notEmpty().withMessage('Quiz ID là bắt buộc'),
  body('assignedTo').isArray({ min: 1 }).withMessage('Phải có ít nhất 1 sinh viên'),
  body('assignedTo.*').isEmail().withMessage('Email không hợp lệ'),
  body('dueDate').isISO8601().withMessage('Ngày hạn nộp không hợp lệ')
];

// Validation cho updateAssignment: assignedTo, dueDate (optional)
const validateUpdateAssignment = [
  body('assignedTo').optional().isArray().withMessage('Danh sách sinh viên không hợp lệ'),
  body('assignedTo.*').optional().isEmail().withMessage('Email không hợp lệ'),
  body('dueDate').optional().isISO8601().withMessage('Ngày hạn nộp không hợp lệ')
];

// ============================================
// ROUTES - Định nghĩa endpoints
// ============================================

// Lấy danh sách bài thi được giao cho sinh viên hiện tại
// Route: GET /api/assignments/assigned-to-me
// Access: Private (Student)
router.get('/assigned-to-me', authenticate, getAssignedQuizzes);

// Lấy danh sách assignments do giáo viên giao
// Route: GET /api/assignments
// Access: Private (Teacher)
router.get('/', authenticate, getAssignments);

// Giao bài thi cho sinh viên
// Route: POST /api/assignments
// Access: Private (Teacher)
// Middleware: authenticate + validateAssignQuiz
router.post('/', authenticate, validateAssignQuiz, assignQuiz);

// Cập nhật assignment
// Route: PUT /api/assignments/:id
// Access: Private (Teacher)
// Middleware: authenticate + validateUpdateAssignment
router.put('/:id', authenticate, validateUpdateAssignment, updateAssignment);

// Xóa assignment
// Route: DELETE /api/assignments/:id
// Access: Private (Teacher)
// Middleware: authenticate
router.delete('/:id', authenticate, deleteAssignment);

export default router;
