// ============================================
// FILE: auth.ts
// MÔ TẢ: Routes cho authentication (xác thực người dùng)
// CHỨC NĂNG: Định nghĩa các endpoints cho đăng ký, đăng nhập, quên mật khẩu, đổi mật khẩu
// ============================================

import express from 'express'; // Express Router
import {
  register,                      // Controller đăng ký
  login,                         // Controller đăng nhập
  getMe,                         // Controller lấy thông tin user hiện tại
  logout,                        // Controller đăng xuất
  requestPasswordReset,          // Controller yêu cầu OTP reset mật khẩu (public)
  resetPasswordWithOtp,          // Controller reset mật khẩu với OTP (public)
  requestChangePasswordOtp, // Controller yêu cầu OTP đổi mật khẩu (private)
  changePasswordWithOtp          // Controller đổi mật khẩu với OTP (private)
} from '../controllers/authController';
import { authenticate } from '../middleware/auth'; // Middleware xác thực JWT token
import { validateRegister, validateLogin } from '../middleware/validation'; // Middleware validation

const router = express.Router();

// ============================================
// PUBLIC ROUTES - Không cần đăng nhập
// ============================================

// Đăng ký tài khoản mới
// Route: POST /api/auth/register
// Access: Public
// Middleware: validateRegister (validate input)
router.post('/register', validateRegister, register);

// Đăng nhập
// Route: POST /api/auth/login
// Access: Public
// Middleware: validateLogin (validate input)
router.post('/login', validateLogin, login);

// Yêu cầu OTP để reset mật khẩu (quên mật khẩu)
// Route: POST /api/auth/forgot
// Access: Public
router.post('/forgot', requestPasswordReset);

// Reset mật khẩu với OTP (quên mật khẩu)
// Route: POST /api/auth/reset
// Access: Public
router.post('/reset', resetPasswordWithOtp);

// ============================================
// PRIVATE ROUTES - Cần đăng nhập
// ============================================

// Lấy thông tin user hiện tại (từ JWT token)
// Route: GET /api/auth/me
// Access: Private
// Middleware: authenticate (xác thực JWT token)
router.get('/me', authenticate, getMe);

// Đăng xuất (chủ yếu để frontend xóa token)
// Route: POST /api/auth/logout
// Access: Private
// Middleware: authenticate
router.post('/logout', authenticate, logout);

// Yêu cầu OTP để đổi mật khẩu (user đã đăng nhập)
// Route: POST /api/auth/change-password/request-otp
// Access: Private
// Middleware: authenticate
router.post('/change-password/request-otp', authenticate, requestChangePasswordOtp);

// Đổi mật khẩu với OTP (user đã đăng nhập)
// Route: POST /api/auth/change-password
// Access: Private
// Middleware: authenticate
router.post('/change-password', authenticate, changePasswordWithOtp);

export default router;