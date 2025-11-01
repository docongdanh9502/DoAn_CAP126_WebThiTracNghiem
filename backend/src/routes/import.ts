// ============================================
// FILE: import.ts
// MÔ TẢ: Routes cho import/export Excel
// CHỨC NĂNG: Định nghĩa endpoints cho download template Excel và import questions/quizzes từ Excel
// ============================================

import express from 'express'; // Express Router
import { importExcel, exportTemplate } from '../controllers/importController'; // Controllers
import { authenticate, authorize } from '../middleware/auth'; // Middleware xác thực và phân quyền
import { uploadExcel } from '../config/multer'; // Middleware upload Excel file

const router = express.Router();

// ============================================
// TEACHER/ADMIN ROUTES - Routes cho giáo viên/admin
// ============================================

// Tải file mẫu Excel để import
// Route: GET /api/import/template
// Access: Private (Teacher/Admin)
// Middleware: authenticate + authorize('teacher', 'admin')
// Response: Excel file (.xlsx) với 2 sheets: "Câu hỏi" và "Bài thi"
router.get('/template', authenticate, authorize('teacher', 'admin'), exportTemplate);

// Upload và import file Excel (tạo questions và quizzes)
// Route: POST /api/import/excel
// Access: Private (Teacher/Admin)
// Middleware: authenticate + authorize('teacher', 'admin') + uploadExcel (handle file upload)
// Body: multipart/form-data với field 'excelFile'
router.post('/excel', authenticate, authorize('teacher', 'admin'), uploadExcel, importExcel);

export default router;

