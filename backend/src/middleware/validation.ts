import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      message: 'Xác thực dữ liệu thất bại',
      errors: errors.array()
    });
    return;
  }
  next();
};

// User validation rules
export const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Vui lòng nhập email hợp lệ'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  body('role')
    .isIn(['teacher', 'student'])
    .withMessage('Vai trò phải là teacher hoặc student'),
  body('username')
    .notEmpty()
    .trim()
    .withMessage('Tên đăng nhập là bắt buộc'),
  // If role is student, require additional profile fields
  body('role').custom((value, { req }) => {
    if (value === 'student') {
      const { studentId, fullName, class: className, gender } = req.body || {};
      if (!studentId) throw new Error('Mã số sinh viên là bắt buộc');
      if (!fullName) throw new Error('Họ tên là bắt buộc');
      if (!className) throw new Error('Lớp là bắt buộc');
      if (!gender || !['male', 'female', 'other'].includes(gender)) throw new Error('Giới tính không hợp lệ');
    }
    if (value === 'teacher') {
      const { fullName } = req.body || {};
      if (!fullName) throw new Error('Họ tên là bắt buộc đối với giáo viên');
    }
    return true;
  }),
  handleValidationErrors
];

export const validateLogin = [
  body('password')
    .notEmpty()
    .withMessage('Mật khẩu là bắt buộc'),
  (req: any, res: any, next: any) => {
    const { username, email, identifier } = req.body || {};
    if (!username && !email && !identifier) {
      return res.status(400).json({ success: false, message: 'Yêu cầu cung cấp tên đăng nhập hoặc email' });
    }
    return next();
  },
  handleValidationErrors
];

// Question validation rules
export const validateQuestion = [
  body('text')
    .notEmpty()
    .trim()
    .withMessage('Nội dung câu hỏi là bắt buộc'),
  body('options')
    .isArray({ min: 2 })
    .withMessage('Cần tối thiểu 2 lựa chọn đáp án'),
  body('correctAnswer')
    .isInt({ min: 0 })
    .withMessage('Đáp án đúng phải là chỉ số hợp lệ'),
  body('subject')
    .notEmpty()
    .trim()
    .withMessage('Môn học là bắt buộc'),
  body('difficulty')
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Độ khó phải là easy, medium hoặc hard'),
  handleValidationErrors
];

// Quiz validation rules
export const validateQuiz = [
  body('title')
    .notEmpty()
    .trim()
    .withMessage('Tiêu đề bài thi là bắt buộc'),
  body('description')
    .notEmpty()
    .trim()
    .withMessage('Mô tả bài thi là bắt buộc'),
  body('subject')
    .notEmpty()
    .trim()
    .withMessage('Môn học là bắt buộc'),
  body('timeLimit')
    .isInt({ min: 1, max: 300 })
    .withMessage('Thời gian làm bài phải từ 1 đến 300 phút'),
  handleValidationErrors
];

// Invitation validation rules
export const validateInvitation = [
  body('emails')
    .isArray({ min: 1 })
    .withMessage('Cần ít nhất 1 email'),
  body('emails.*')
    .isEmail()
    .normalizeEmail()
    .withMessage('Vui lòng nhập email hợp lệ'),
  body('studentNames')
    .isArray({ min: 1 })
    .withMessage('Cần ít nhất 1 tên sinh viên'),
  body('studentIds')
    .isArray({ min: 1 })
    .withMessage('Cần ít nhất 1 mã sinh viên'),
  handleValidationErrors
];