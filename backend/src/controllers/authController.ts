// ============================================
// FILE: authController.ts
// MÔ TẢ: Controller xử lý authentication và authorization
// CHỨC NĂNG: Đăng ký, đăng nhập, đăng xuất, quên mật khẩu, đổi mật khẩu với OTP
// ============================================

import { Request, Response } from 'express';     // Types từ Express
import bcrypt from 'bcryptjs';                    // Thư viện hash mật khẩu
import User, { IUser } from '../models/User';    // Model User
import { generateToken } from '../config/jwt';    // Hàm tạo JWT token
import { sendEmail } from '../config/email';      // Hàm gửi email
import { asyncHandler } from '../middleware/errorHandler'; // Wrapper bắt lỗi async

// ============================================
// REGISTER - Đăng ký tài khoản
// ============================================
/**
 * Đăng ký tài khoản user mới
 * Route: POST /api/auth/register
 * Access: Public (không cần đăng nhập)
 * 
 * Flow:
 * 1. Kiểm tra email đã tồn tại chưa
 * 2. Hash mật khẩu bằng bcrypt
 * 3. Tạo user mới trong database
 * 4. Tạo JWT token
 * 5. Trả về thông tin user và token
 */
// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Lấy dữ liệu từ request body
  const { email, password, role, username, studentId, fullName, class: className, gender } = req.body as any;

  // Kiểm tra email đã tồn tại trong hệ thống chưa
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400).json({
      success: false,
      message: 'Email này đã được đăng ký'
    });
    return;
  }

  // Mã hóa mật khẩu bằng bcrypt với salt rounds = 10
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Tạo user mới trong database
  const user = await User.create({
    email,                      // Email
    password: hashedPassword,   // Mật khẩu đã được hash
    role,                       // Vai trò (teacher/student)
    username,                   // Username
    isEmailVerified: false,     // Email chưa được xác thực (mặc định)
    // Các trường profile
    fullName,                   // Họ tên
    gender,                     // Giới tính
    // Các trường chỉ dành cho sinh viên
    studentId: role === 'student' ? studentId : undefined,    // MSSV (chỉ cho student)
    class: role === 'student' ? className : undefined        // Lớp (chỉ cho student)
  });

  // Tạo JWT token để user có thể đăng nhập ngay sau khi đăng ký
  const token = generateToken({
    userId: user.id,            // ID của user
    email: user.email,           // Email
    role: user.role             // Vai trò
  });

  // Trả về thông tin user và token (không trả về password)
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
      token // JWT token để frontend lưu và dùng cho các request sau
    }
  });
});

// ============================================
// LOGIN - Đăng nhập
// ============================================
/**
 * Đăng nhập user
 * Route: POST /api/auth/login
 * Access: Public
 * 
 * Flow:
 * 1. Tìm user theo username hoặc email
 * 2. Kiểm tra tài khoản có đang hoạt động không
 * 3. Kiểm tra mật khẩu có đúng không
 * 4. Cập nhật lastLogin
 * 5. Tạo JWT token
 * 6. Trả về thông tin user và token
 */
// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Lấy thông tin đăng nhập từ request body (hỗ trợ username, email hoặc identifier)
  const { username, email, identifier, password } = req.body as { username?: string; email?: string; identifier?: string; password: string };

  // Chuẩn hóa username và email (loại bỏ khoảng trắng, chuyển email thành lowercase)
  const normalizedUsername = (username || identifier)?.toString().trim();
  const normalizedEmail = email?.toString().toLowerCase().trim();

  // Tạo điều kiện tìm kiếm: tìm theo username HOẶC email
  const orConditions = [] as any[];
  if (normalizedUsername) orConditions.push({ username: normalizedUsername });
  if (normalizedEmail) orConditions.push({ email: normalizedEmail });
  
  // Tìm user trong database (select +password để có thể so sánh mật khẩu)
  const user = await User.findOne(orConditions.length ? { $or: orConditions } : {}).select('+password');
  
  // Nếu không tìm thấy user, trả về lỗi
  if (!user) {
    res.status(401).json({
      success: false,
      message: 'Sai thông tin đăng nhập'
    });
    return;
  }

  // Kiểm tra tài khoản có đang hoạt động không
  if (!user.isActive) {
    res.status(401).json({
      success: false,
      message: 'Tài khoản đã bị vô hiệu hóa'
    });
    return;
  }

  // So sánh mật khẩu người dùng nhập với mật khẩu đã hash trong database
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(401).json({
      success: false,
      message: 'Sai thông tin đăng nhập'
    });
    return;
  }

  // Cập nhật thời gian đăng nhập cuối cùng
  user.lastLogin = new Date();
  await user.save();

  // Tạo JWT token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });

  // Trả về thông tin user và token
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
      token // JWT token để frontend lưu và dùng cho các request sau
    }
  });
});

// ============================================
// GET ME - Lấy thông tin user hiện tại
// ============================================
/**
 * Lấy thông tin của user hiện tại (đã đăng nhập)
 * Route: GET /api/auth/me
 * Access: Private (cần đăng nhập)
 * 
 * Flow:
 * 1. Lấy user từ req.user (đã được set bởi authenticate middleware)
 * 2. Trả về thông tin user (không có password)
 */
// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Lấy user từ request (đã được authenticate middleware set)
  const user = req.user as IUser;

  // Trả về thông tin user (bao gồm tất cả profile fields để frontend có thể persist sau khi refresh)
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
        // Bao gồm các trường profile để frontend có thể lưu sau khi refresh
        avatar: (user as any).avatar || '',
        phone: (user as any).phone || '',
        studentId: (user as any).studentId || '',
        class: (user as any).class || '',
        gender: (user as any).gender || ''
      }
    }
  });
});

// ============================================
// LOGOUT - Đăng xuất
// ============================================
/**
 * Đăng xuất user (JWT là stateless nên chỉ cần xóa token ở client)
 * Route: POST /api/auth/logout
 * Access: Private
 * 
 * Note: Với JWT, logout chỉ cần frontend xóa token
 * Backend không cần làm gì vì JWT không lưu trên server
 */
// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // JWT là stateless, không cần xóa token trên server
  // Frontend chỉ cần xóa token khỏi localStorage/sessionStorage
  res.json({
    success: true,
    message: 'Đăng xuất thành công'
  });
});

// ============================================
// REQUEST PASSWORD RESET - Yêu cầu OTP reset mật khẩu (public)
// ============================================
/**
 * Yêu cầu gửi OTP để reset mật khẩu (cho user chưa đăng nhập)
 * Route: POST /api/auth/forgot
 * Access: Public
 * 
 * Flow:
 * 1. Tìm user theo email hoặc username
 * 2. Tạo mã OTP 6 số ngẫu nhiên
 * 3. Lưu OTP và thời gian hết hạn vào database
 * 4. Gửi OTP qua email
 */
// @desc    Request password reset OTP
// @route   POST /api/auth/forgot
// @access  Public
export const requestPasswordReset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Lấy email hoặc username từ request body
  const { email, username } = req.body as { email?: string; username?: string };
  
  // Tạo query tìm user theo email hoặc username
  const query: any = {};
  if (email) query.email = email.toLowerCase().trim();
  if (username) query.username = username.trim();
  
  // Tìm user trong database
  const user = await User.findOne(query);
  if (!user) {
    res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    return;
  }
  
  // Tạo mã OTP 6 số ngẫu nhiên (100000 - 999999)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.passwordResetOtp = otp;
  
  // Thiết lập thời gian hết hạn OTP (mặc định 10 phút, có thể cấu hình trong .env)
  const otpExpiresMin = parseInt(process.env.OTP_EXPIRES_MIN || '10');
  user.passwordResetExpires = new Date(Date.now() + otpExpiresMin * 60 * 1000);
  await user.save();
  
  // Gửi email chứa OTP
  try {
    await sendEmail(
      user.email,
      'Mã xác nhận đặt lại mật khẩu',
      `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #1976d2;">Mã xác nhận đặt lại mật khẩu</h2>
        <p>Xin chào,</p>
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Mã OTP của bạn là:</p>
        <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
          ${otp}
        </div>
        <p>Mã này sẽ hết hạn sau <strong>${otpExpiresMin} phút</strong>.</p>
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">Trân trọng,<br>Hệ thống thi trắc nghiệm</p>
      </div>`
    );
    res.json({ success: true, message: 'Đã gửi mã OTP tới email của bạn' });
  } catch (e: any) {
    // Log lỗi gửi email
    console.error('[OTP] Email send error:', e);
    // Trả về lỗi chi tiết hơn cho người dùng
    res.status(500).json({ 
      success: false, 
      message: 'Không thể gửi email. Vui lòng kiểm tra lại cấu hình email hoặc thử lại sau.',
      error: process.env.NODE_ENV === 'development' ? e.message : undefined // Chỉ hiển thị chi tiết lỗi trong development
    });
  }
});

// ============================================
// RESET PASSWORD WITH OTP - Đặt lại mật khẩu với OTP (public)
// ============================================
/**
 * Đặt lại mật khẩu bằng OTP (cho user chưa đăng nhập - quên mật khẩu)
 * Route: POST /api/auth/reset
 * Access: Public
 * 
 * Flow:
 * 1. Tìm user theo email hoặc username
 * 2. Kiểm tra OTP có đúng và chưa hết hạn không
 * 3. Hash mật khẩu mới
 * 4. Cập nhật mật khẩu và xóa OTP
 */
// @desc    Reset password with OTP
// @route   POST /api/auth/reset
// @access  Public
export const resetPasswordWithOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Lấy thông tin từ request body
  const { email, username, otp, newPassword } = req.body as { email?: string; username?: string; otp: string; newPassword: string };
  
  // Tạo query tìm user
  const query: any = {};
  if (email) query.email = email.toLowerCase().trim();
  if (username) query.username = username.trim();
  
  // Tìm user (cần select password để có thể update)
  const user = await User.findOne(query).select('+password');
  
  // Kiểm tra user tồn tại và có OTP chưa
  if (!user || !user.passwordResetOtp || !user.passwordResetExpires) {
    res.status(400).json({ success: false, message: 'Yêu cầu không hợp lệ' });
    return;
  }
  
  // Kiểm tra OTP có đúng và chưa hết hạn không
  if (user.passwordResetOtp !== otp || user.passwordResetExpires.getTime() < Date.now()) {
    res.status(400).json({ success: false, message: 'Mã OTP không đúng hoặc đã hết hạn' });
    return;
  }
  
  // Hash mật khẩu mới
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  
  // Xóa OTP và thời gian hết hạn sau khi đổi mật khẩu thành công
  user.passwordResetOtp = undefined;
  user.passwordResetExpires = undefined as any;
  await user.save();
  
  res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
});

// ============================================
// REQUEST CHANGE PASSWORD OTP - Yêu cầu OTP đổi mật khẩu (authenticated)
// ============================================
/**
 * Yêu cầu gửi OTP để đổi mật khẩu (cho user đã đăng nhập)
 * Route: POST /api/auth/change-password/request-otp
 * Access: Private (cần đăng nhập)
 * 
 * Flow:
 * 1. Lấy userId từ token (req.user)
 * 2. Tạo mã OTP 6 số
 * 3. Lưu OTP và thời gian hết hạn
 * 4. Gửi OTP qua email
 */
// @desc    Request OTP for changing password (authenticated users)
// @route   POST /api/auth/change-password/request-otp
// @access  Private
export const requestChangePasswordOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Lấy userId từ token (đã được authenticate middleware set)
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Không được phép' });
    return;
  }

  // Tìm user trong database
  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    return;
  }

  // Tạo mã OTP 6 số ngẫu nhiên (100000 - 999999)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.passwordResetOtp = otp;
  
  // Thiết lập thời gian hết hạn OTP
  const otpExpiresMin = parseInt(process.env.OTP_EXPIRES_MIN || '10');
  user.passwordResetExpires = new Date(Date.now() + otpExpiresMin * 60 * 1000);
  await user.save();

  // Gửi email chứa OTP
  try {
    await sendEmail(
      user.email,
      'Mã xác nhận đổi mật khẩu',
      `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #1976d2;">Mã xác nhận đổi mật khẩu</h2>
        <p>Xin chào ${(user as any).fullName || user.username},</p>
        <p>Bạn đã yêu cầu đổi mật khẩu tài khoản. Mã OTP của bạn là:</p>
        <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
          ${otp}
        </div>
        <p>Mã này sẽ hết hạn sau <strong>${otpExpiresMin} phút</strong>.</p>
        <p>Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này và kiểm tra tài khoản của bạn.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">Trân trọng,<br>Hệ thống thi trắc nghiệm</p>
      </div>`
    );
    res.json({ success: true, message: 'Đã gửi mã OTP tới email của bạn' });
  } catch (e: any) {
    // Log lỗi gửi email
    console.error('[Change Password OTP] Email send error:', e);
    res.status(500).json({ 
      success: false, 
      message: 'Không thể gửi email. Vui lòng kiểm tra lại cấu hình email hoặc thử lại sau.',
      error: process.env.NODE_ENV === 'development' ? e.message : undefined
    });
  }
});

// ============================================
// CHANGE PASSWORD WITH OTP - Đổi mật khẩu với OTP (authenticated)
// ============================================
/**
 * Đổi mật khẩu bằng OTP (cho user đã đăng nhập)
 * Route: POST /api/auth/change-password
 * Access: Private (cần đăng nhập)
 * 
 * Flow:
 * 1. Kiểm tra user đã đăng nhập chưa
 * 2. Kiểm tra mật khẩu hiện tại có đúng không
 * 3. Kiểm tra OTP có đúng và chưa hết hạn không
 * 4. Validate mật khẩu mới (tối thiểu 8 ký tự)
 * 5. Hash và cập nhật mật khẩu mới
 * 6. Xóa OTP
 */
// @desc    Change password with OTP (authenticated users)
// @route   POST /api/auth/change-password
// @access  Private
export const changePasswordWithOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Lấy userId từ token
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Không được phép' });
    return;
  }

  // Lấy thông tin từ request body
  const { currentPassword, otp, newPassword } = req.body as { currentPassword: string; otp: string; newPassword: string };

  // Kiểm tra đầy đủ thông tin
  if (!currentPassword || !otp || !newPassword) {
    res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' });
    return;
  }

  // Tìm user (cần select password để so sánh)
  const user = await User.findById(userId).select('+password');
  if (!user) {
    res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    return;
  }

  // Xác thực mật khẩu hiện tại
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
    return;
  }

  // Xác thực OTP
  if (!user.passwordResetOtp || !user.passwordResetExpires) {
    res.status(400).json({ success: false, message: 'Vui lòng yêu cầu mã OTP trước' });
    return;
  }

  // Kiểm tra OTP có đúng và chưa hết hạn không
  if (user.passwordResetOtp !== otp || user.passwordResetExpires.getTime() < Date.now()) {
    res.status(400).json({ success: false, message: 'Mã OTP không đúng hoặc đã hết hạn' });
    return;
  }

  // Validate độ mạnh mật khẩu mới (tối thiểu 8 ký tự)
  if (newPassword.length < 8) {
    res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 8 ký tự' });
    return;
  }

  // Hash mật khẩu mới
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  
  // Xóa OTP sau khi đổi mật khẩu thành công
  user.passwordResetOtp = undefined;
  user.passwordResetExpires = undefined as any;
  await user.save();

  res.json({ success: true, message: 'Đổi mật khẩu thành công' });
});