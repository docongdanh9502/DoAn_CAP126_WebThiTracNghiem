// ============================================
// FILE: quizResult.ts
// MÔ TẢ: Routes cho quản lý QuizResult (Kết quả bài thi)
// CHỨC NĂNG: Định nghĩa các endpoints cho quiz results (nộp bài, xem kết quả, export Excel)
// ============================================

import express from 'express'; // Express Router
import {
  checkQuizCompletion,        // Controller: Kiểm tra đã làm bài chưa
  submitQuizResult,            // Controller: Nộp kết quả bài thi
  getStudentQuizResults,       // Controller: Lấy kết quả của sinh viên
  getQuizResults,              // Controller: Lấy kết quả một bài thi (Teacher)
  getMyResultsSummary,         // Controller: Lấy tổng kết kết quả
  exportQuizResultsToExcel     // Controller: Xuất kết quả ra Excel
} from '../controllers/quizResultController';
import { authenticate, authorize } from '../middleware/auth'; // Middleware xác thực và phân quyền

const router = express.Router();

// ============================================
// STUDENT ROUTES - Routes cho sinh viên
// ============================================

// Kiểm tra đã làm bài thi chưa
// Route: GET /api/quiz-results/:quizId/check?assignmentId=xxx
// Access: Private (Student)
// Middleware: authenticate
router.get('/:quizId/check', authenticate, checkQuizCompletion);

// Nộp kết quả bài thi
// Route: POST /api/quiz-results
// Access: Private (Student)
// Middleware: authenticate
router.post('/', authenticate, submitQuizResult);

// Lấy kết quả các bài thi của sinh viên
// Route: GET /api/quiz-results
// Access: Private (Student)
// Middleware: authenticate
router.get('/', authenticate, getStudentQuizResults);

// ============================================
// TEACHER/ADMIN ROUTES - Routes cho giáo viên/admin
// ============================================

// QUAN TRỌNG: Route export phải đặt TRƯỚC route /quiz/:quizId
// Vì Express match routes theo thứ tự, nếu đặt sau thì /quiz/:quizId sẽ match trước /quiz/:quizId/export

// Xuất kết quả bài thi ra Excel (có filter)
// Route: GET /api/quiz-results/quiz/:quizId/export
// Access: Private (Teacher/Admin)
// Middleware: authenticate + authorize('teacher', 'admin')
router.get('/quiz/:quizId/export', authenticate, authorize('teacher', 'admin'), exportQuizResultsToExcel);

// Lấy kết quả một bài thi cụ thể (có pagination và filter)
// Route: GET /api/quiz-results/quiz/:quizId
// Access: Private (Teacher/Admin)
// Middleware: authenticate + authorize('teacher', 'admin')
router.get('/quiz/:quizId', authenticate, authorize('teacher', 'admin'), getQuizResults);

// Lấy tổng kết kết quả của giáo viên
// Route: GET /api/quiz-results/summary/my
// Access: Private (Teacher)
// Middleware: authenticate + authorize('teacher')
router.get('/summary/my', authenticate, authorize('teacher'), getMyResultsSummary);

export default router;
