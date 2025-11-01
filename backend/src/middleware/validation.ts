// ============================================
// FILE: validation.ts
// MÔ TẢ: Middleware validation cho các request input
// CHỨC NĂNG: Xác thực dữ liệu đầu vào trước khi xử lý (email, password, required fields, etc.)
// ============================================

import { Request, Response, NextFunction } from 'express'; // Types từ Express
import { body, validationResult } from 'express-validator'; // Thư viện validation

// ============================================
// HANDLE VALIDATION ERRORS
// ============================================
/**
 * Middleware kiểm tra kết quả validation
 * - Nếu có lỗi validation, trả về 400 với danh sách lỗi
 * - Nếu không có lỗi, chuyển sang middleware/controller tiếp theo
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  // Lấy kết quả validation từ express-validator
  const errors = validationResult(req);
  
  // Nếu có lỗi, trả về response 400
  if (!errors.isEmpty()) {
    res.status(400).json({
      message: 'Xác thực dữ liệu thất bại',
      errors: errors.array() // Mảng các lỗi chi tiết
    });
    return;
  }
  
  // Nếu không có lỗi, tiếp tục
  next();
};

// ============================================
// USER VALIDATION RULES - Đăng ký
// ============================================
/**
 * Validation rules cho đăng ký user
 * - Email: phải là email hợp lệ
 * - Password: tối thiểu 6 ký tự
 * - Role: chỉ cho phép 'teacher' hoặc 'student'
 * - Username: bắt buộc
 * - Nếu là student: bắt buộc studentId, fullName, class, gender
 * - Nếu là teacher: bắt buộc fullName
 */
export const validateRegister = [
  // Email: bắt buộc, phải là email hợp lệ, tự động normalize
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Vui lòng nhập email hợp lệ'),
  
  // Password: tối thiểu 6 ký tự
  body('password')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  
  // Role: chỉ cho phép teacher hoặc student
  body('role')
    .isIn(['teacher', 'student'])
    .withMessage('Vai trò phải là teacher hoặc student'),
  
  // Username: bắt buộc, loại bỏ khoảng trắng
  body('username')
    .notEmpty()
    .trim()
    .withMessage('Tên đăng nhập là bắt buộc'),
  
  // Validation tùy chỉnh theo role
  body('role').custom((value, { req }) => {
    // Nếu là sinh viên, bắt buộc các field sau
    if (value === 'student') {
      const { studentId, fullName, class: className, gender } = req.body || {};
      if (!studentId) throw new Error('Mã số sinh viên là bắt buộc');
      if (!fullName) throw new Error('Họ tên là bắt buộc');
      if (!className) throw new Error('Lớp là bắt buộc');
      if (!gender || !['male', 'female', 'other'].includes(gender)) throw new Error('Giới tính không hợp lệ');
    }
    // Nếu là giáo viên, bắt buộc fullName
    if (value === 'teacher') {
      const { fullName } = req.body || {};
      if (!fullName) throw new Error('Họ tên là bắt buộc đối với giáo viên');
    }
    return true;
  }),
  
  // Xử lý validation errors
  handleValidationErrors
];

// ============================================
// USER VALIDATION RULES - Đăng nhập
// ============================================
/**
 * Validation rules cho đăng nhập
 * - Password: bắt buộc
 * - Username hoặc email hoặc identifier: ít nhất một trong ba phải có
 */
export const validateLogin = [
  // Password: bắt buộc
  body('password')
    .notEmpty()
    .withMessage('Mật khẩu là bắt buộc'),
  
  // Kiểm tra ít nhất một trong username, email hoặc identifier phải có
  (req: any, res: any, next: any) => {
    const { username, email, identifier } = req.body || {};
    if (!username && !email && !identifier) {
      return res.status(400).json({ success: false, message: 'Yêu cầu cung cấp tên đăng nhập hoặc email' });
    }
    return next();
  },
  
  // Xử lý validation errors
  handleValidationErrors
];

// ============================================
// QUESTION VALIDATION RULES
// ============================================
/**
 * Validation rules cho câu hỏi
 * - Text: nội dung câu hỏi bắt buộc
 * - Options: mảng tối thiểu 2 phương án
 * - CorrectAnswer: số nguyên >= 0
 * - Subject: môn học bắt buộc
 * - Difficulty: chỉ cho phép easy, medium, hard
 */
export const validateQuestion = [
  // Nội dung câu hỏi: bắt buộc
  body('text')
    .notEmpty()
    .trim()
    .withMessage('Nội dung câu hỏi là bắt buộc'),
  
  // Mảng phương án: tối thiểu 2 phương án
  body('options')
    .isArray({ min: 2 })
    .withMessage('Cần tối thiểu 2 lựa chọn đáp án'),
  
  // Đáp án đúng: số nguyên >= 0
  body('correctAnswer')
    .isInt({ min: 0 })
    .withMessage('Đáp án đúng phải là chỉ số hợp lệ'),
  
  // Môn học: bắt buộc
  body('subject')
    .notEmpty()
    .trim()
    .withMessage('Môn học là bắt buộc'),
  
  // Độ khó: chỉ cho phép 3 giá trị
  body('difficulty')
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Độ khó phải là easy, medium hoặc hard'),
  
  // Xử lý validation errors
  handleValidationErrors
];

// ============================================
// QUIZ VALIDATION RULES
// ============================================
/**
 * Validation rules cho bài thi
 * - Title: tiêu đề bắt buộc
 * - Description: mô tả bắt buộc
 * - Subject: môn học bắt buộc
 * - TimeLimit: số nguyên từ 1 đến 300 phút
 */
export const validateQuiz = [
  // Tiêu đề: bắt buộc
  body('title')
    .notEmpty()
    .trim()
    .withMessage('Tiêu đề bài thi là bắt buộc'),
  
  // Mô tả: bắt buộc
  body('description')
    .notEmpty()
    .trim()
    .withMessage('Mô tả bài thi là bắt buộc'),
  
  // Môn học: bắt buộc
  body('subject')
    .notEmpty()
    .trim()
    .withMessage('Môn học là bắt buộc'),
  
  // Thời gian làm bài: từ 1 đến 300 phút
  body('timeLimit')
    .isInt({ min: 1, max: 300 })
    .withMessage('Thời gian làm bài phải từ 1 đến 300 phút'),
  
  // Xử lý validation errors
  handleValidationErrors
];

// ============================================
// INVITATION VALIDATION RULES
// ============================================
/**
 * Validation rules cho invitation (mời tham gia thi)
 * - Emails: mảng tối thiểu 1 email, mỗi email phải hợp lệ
 * - StudentNames: mảng tối thiểu 1 tên
 * - StudentIds: mảng tối thiểu 1 mã sinh viên
 */
export const validateInvitation = [
  // Mảng emails: tối thiểu 1 email
  body('emails')
    .isArray({ min: 1 })
    .withMessage('Cần ít nhất 1 email'),
  
  // Mỗi email trong mảng phải hợp lệ
  body('emails.*')
    .isEmail()
    .normalizeEmail()
    .withMessage('Vui lòng nhập email hợp lệ'),
  
  // Mảng tên sinh viên: tối thiểu 1 tên
  body('studentNames')
    .isArray({ min: 1 })
    .withMessage('Cần ít nhất 1 tên sinh viên'),
  
  // Mảng mã sinh viên: tối thiểu 1 mã
  body('studentIds')
    .isArray({ min: 1 })
    .withMessage('Cần ít nhất 1 mã sinh viên'),
  
  // Xử lý validation errors
  handleValidationErrors
];