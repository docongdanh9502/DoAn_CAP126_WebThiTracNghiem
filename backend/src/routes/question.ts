// ============================================
// FILE: question.ts
// MÔ TẢ: Routes cho quản lý Question (Câu hỏi)
// CHỨC NĂNG: Định nghĩa các endpoints CRUD cho Question
// ============================================

import express from 'express'; // Express Router
import {
  getQuestions,      // Controller lấy danh sách questions
  getQuestion,       // Controller lấy chi tiết một question
  createQuestion,    // Controller tạo question mới
  updateQuestion,    // Controller cập nhật question
  deleteQuestion,    // Controller xóa question
  getQuestionStats   // Controller thống kê questions
} from '../controllers/questionController';
import { authenticate, authorize } from '../middleware/auth'; // Middleware xác thực và phân quyền
import { validateQuestion } from '../middleware/validation'; // Middleware validation

const router = express.Router();

// ============================================
// PRIVATE ROUTES - Cần đăng nhập
// ============================================

// Lấy danh sách tất cả questions (có pagination, search, filter)
// Route: GET /api/questions
// Access: Private
// Middleware: authenticate
// Note: Teacher chỉ thấy question của mình, Admin thấy tất cả, Student không thấy
router.get('/', authenticate, getQuestions);

// Lấy thống kê về questions
// Route: GET /api/questions/stats
// Access: Private (Teacher/Admin)
// Middleware: authenticate + authorize('teacher')
// Note: Route này phải đặt trước '/:id' để tránh conflict
router.get('/stats', authenticate, authorize('teacher'), getQuestionStats);

// Lấy chi tiết một question theo ID
// Route: GET /api/questions/:id
// Access: Private
// Middleware: authenticate
router.get('/:id', authenticate, getQuestion);

// ============================================
// TEACHER/ADMIN ROUTES - Chỉ Teacher hoặc Admin
// ============================================

// Tạo question mới
// Route: POST /api/questions
// Access: Private (Teacher/Admin)
// Middleware: authenticate + authorize('teacher') + validateQuestion
router.post('/', authenticate, authorize('teacher'), validateQuestion, createQuestion);

// Cập nhật question
// Route: PUT /api/questions/:id
// Access: Private (Teacher/Admin)
// Middleware: authenticate + authorize('teacher') + validateQuestion
router.put('/:id', authenticate, authorize('teacher'), validateQuestion, updateQuestion);

// Xóa question
// Route: DELETE /api/questions/:id
// Access: Private (Teacher/Admin)
// Middleware: authenticate + authorize('teacher')
router.delete('/:id', authenticate, authorize('teacher'), deleteQuestion);

export default router;