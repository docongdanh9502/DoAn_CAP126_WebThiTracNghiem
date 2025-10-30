import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/User';
import { generateToken } from '../config/jwt';
import { sendEmail } from '../config/email';
import { asyncHandler } from '../middleware/errorHandler';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, role, username, studentId, fullName, class: className, gender } = req.body as any;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400).json({
      success: false,
      message: 'Email này đã được đăng ký'
    });
    return;
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user = await User.create({
    email,
    password: hashedPassword,
    role,
    username,
    isEmailVerified: false,
    // profile fields
    fullName,
    gender,
    // student-only fields
    studentId: role === 'student' ? studentId : undefined,
    class: role === 'student' ? className : undefined
  });

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });
  // Debug: print JWT token string to server console
  // eslint-disable-next-line no-console
  console.log('[AUTH][REGISTER] JWT:', token);

  res.status(201).json({
    success: true,
    message: 'Đăng ký thành công',
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username,
        isEmailVerified: user.isEmailVerified,
        studentId: (user as any).studentId || '',
        fullName: (user as any).fullName || '',
        class: (user as any).class || '',
        gender: (user as any).gender || ''
      },
      token
    }
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { username, email, identifier, password } = req.body as { username?: string; email?: string; identifier?: string; password: string };

  const normalizedUsername = (username || identifier)?.toString().trim();
  const normalizedEmail = email?.toString().toLowerCase().trim();

  // Debug trace
  // eslint-disable-next-line no-console
  console.log('[AUTH] Login attempt:', { username: normalizedUsername, email: normalizedEmail });

  // Check if user exists by username or email
  const orConditions = [] as any[];
  if (normalizedUsername) orConditions.push({ username: normalizedUsername });
  if (normalizedEmail) orConditions.push({ email: normalizedEmail });
  const user = await User.findOne(orConditions.length ? { $or: orConditions } : {}).select('+password');
  if (!user) {
    res.status(401).json({
      success: false,
      message: 'Sai thông tin đăng nhập'
    });
    return;
  }

  // Check if user is active
  if (!user.isActive) {
    res.status(401).json({
      success: false,
      message: 'Tài khoản đã bị vô hiệu hóa'
    });
    return;
  }

  // Check password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(401).json({
      success: false,
      message: 'Sai thông tin đăng nhập'
    });
    return;
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });
  // Debug: print JWT token string to server console
  // eslint-disable-next-line no-console
  console.log('[AUTH][LOGIN] JWT:', token);

  res.json({
    success: true,
    message: 'Đăng nhập thành công',
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username,
        fullName: (user as any).fullName || '',
        studentId: (user as any).studentId || '',
        class: (user as any).class || '',
        gender: (user as any).gender || '',
        avatar: (user as any).avatar || '',
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin
      },
      token
    }
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user as IUser;

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username,
        fullName: (user as any).fullName || '',
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        // Include profile fields so frontend can persist them after refresh
        avatar: (user as any).avatar || '',
        phone: (user as any).phone || '',
        studentId: (user as any).studentId || '',
        class: (user as any).class || '',
        gender: (user as any).gender || ''
      }
    }
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    message: 'Đăng xuất thành công'
  });
});

// @desc    Request password reset OTP
// @route   POST /api/auth/forgot
// @access  Public
export const requestPasswordReset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, username } = req.body as { email?: string; username?: string };
  const query: any = {};
  if (email) query.email = email.toLowerCase().trim();
  if (username) query.username = username.trim();
  const user = await User.findOne(query);
  if (!user) {
    res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    return;
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.passwordResetOtp = otp;
  const otpExpiresMin = parseInt(process.env.OTP_EXPIRES_MIN || '10');
  user.passwordResetExpires = new Date(Date.now() + otpExpiresMin * 60 * 1000);
  await user.save();
  try {
    await sendEmail(
      user.email,
      'Mã xác nhận đặt lại mật khẩu',
      `<p>Mã OTP của bạn: <b>${otp}</b> (hết hạn sau ${otpExpiresMin} phút)</p>`
    );
  } catch (e) {
    console.error('Email send error:', e);
  }
  res.json({ success: true, message: 'Đã gửi mã OTP tới email của bạn' });
});

// @desc    Reset password with OTP
// @route   POST /api/auth/reset
// @access  Public
export const resetPasswordWithOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, username, otp, newPassword } = req.body as { email?: string; username?: string; otp: string; newPassword: string };
  const query: any = {};
  if (email) query.email = email.toLowerCase().trim();
  if (username) query.username = username.trim();
  const user = await User.findOne(query).select('+password');
  if (!user || !user.passwordResetOtp || !user.passwordResetExpires) {
    res.status(400).json({ success: false, message: 'Yêu cầu không hợp lệ' });
    return;
  }
  if (user.passwordResetOtp !== otp || user.passwordResetExpires.getTime() < Date.now()) {
    res.status(400).json({ success: false, message: 'Mã OTP không đúng hoặc đã hết hạn' });
    return;
  }
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  user.passwordResetOtp = undefined;
  user.passwordResetExpires = undefined as any;
  await user.save();
  res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
});