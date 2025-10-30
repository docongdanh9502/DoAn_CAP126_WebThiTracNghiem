import express from 'express';
import {
  register,
  login,
  getMe,
  logout,
  requestPasswordReset,
  resetPasswordWithOtp
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validateRegister, validateLogin } from '../middleware/validation';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', validateRegister, register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateLogin, login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, getMe);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticate, logout);

// Forgot password + OTP reset
router.post('/forgot', requestPasswordReset);
router.post('/reset', resetPasswordWithOtp);

export default router;