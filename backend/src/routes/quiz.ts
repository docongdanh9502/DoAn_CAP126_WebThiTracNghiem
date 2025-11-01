// ============================================
// FILE: quiz.ts
// MÔ TẢ: Routes cho quản lý Quiz (Bài thi)
// CHỨC NĂNG: Định nghĩa các endpoints CRUD cho Quiz
// ============================================

import express from 'express'; // Express Router
import {
  getQuizzes,  // Controller lấy danh sách quizzes
  getQuiz,     // Controller lấy chi tiết một quiz
  createQuiz,  // Controller tạo quiz mới
  updateQuiz,  // Controller cập nhật quiz
  deleteQuiz   // Controller xóa quiz
} from '../controllers/quizController';
import { authenticate, authorize } from '../middleware/auth'; // Middleware xác thực và phân quyền
import { validateQuiz } from '../middleware/validation'; // Middleware validation

const router = express.Router();

// ============================================
// PRIVATE ROUTES - Cần đăng nhập
// ============================================

// Lấy danh sách tất cả quizzes (có pagination, search)
// Route: GET /api/quizzes
// Access: Private
// Middleware: authenticate
// Note: Teacher chỉ thấy quiz của mình, Admin thấy tất cả, Student không dùng endpoint này
router.get('/', authenticate, getQuizzes);

// Lấy chi tiết một quiz theo ID
// Route: GET /api/quizzes/:id
// Access: Private
// Middleware: authenticate
router.get('/:id', authenticate, getQuiz);

// ============================================
// TEACHER/ADMIN ROUTES - Chỉ Teacher hoặc Admin
// ============================================

// Tạo quiz mới
// Route: POST /api/quizzes
// Access: Private (Teacher/Admin)
// Middleware: authenticate + authorize('teacher') + validateQuiz
router.post('/', authenticate, authorize('teacher'), validateQuiz, createQuiz);

// Cập nhật quiz
// Route: PUT /api/quizzes/:id
// Access: Private (Teacher/Admin)
// Middleware: authenticate + authorize('teacher') + validateQuiz
router.put('/:id', authenticate, authorize('teacher'), validateQuiz, updateQuiz);

// Xóa quiz
// Route: DELETE /api/quizzes/:id
// Access: Private (Teacher/Admin)
// Middleware: authenticate + authorize('teacher')
router.delete('/:id', authenticate, authorize('teacher'), deleteQuiz);

export default router;