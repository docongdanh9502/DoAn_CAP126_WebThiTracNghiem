// ============================================
// FILE: userController.ts
// MÔ TẢ: Controller xử lý CRUD operations cho User (Admin quản lý người dùng)
// CHỨC NĂNG: Lấy danh sách, tạo, sửa, xóa user; Admin luôn ở đầu danh sách
// ============================================

import { Request, Response } from 'express';     // Types từ Express
import bcrypt from 'bcryptjs';                    // Thư viện hash mật khẩu
import User from '../models/User';                // Model User
import { asyncHandler } from '../middleware/errorHandler'; // Wrapper bắt lỗi async

// ============================================
// GET USERS - Lấy danh sách users (Admin)
// ============================================
/**
 * Lấy danh sách tất cả users với pagination, search và filter
 * Route: GET /api/users
 * Access: Private (Admin only)
 * 
 * Features:
 * - Pagination (page, limit)
 * - Tìm kiếm theo email, username, fullName, studentId
 * - Lọc theo role (admin, teacher, student)
 * - Lọc theo isActive (true/false)
 * - Admin luôn được sắp xếp ở đầu danh sách (sử dụng MongoDB aggregation)
 */
// @desc    Get all users (with pagination and search)
// @route   GET /api/users
// @access  Private (Admin)
export const getUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Lấy các tham số pagination và filter từ query string
  const page = parseInt((req.query.page as string) || '1');              // Trang hiện tại (mặc định 1)
  const limit = parseInt((req.query.limit as string) || '10');            // Số lượng mỗi trang (mặc định 10)
  const search = (req.query.search as string) || '';                      // Từ khóa tìm kiếm
  const role = (req.query.role as string) || '';                         // Lọc theo role
  const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined; // Lọc theo trạng thái

  // Xây dựng filter cho MongoDB query
  const filter: any = {};
  
  // Tìm kiếm theo email, username, fullName hoặc studentId (không phân biệt hoa thường)
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: 'i' } },       // Tìm trong email
      { username: { $regex: search, $options: 'i' } },   // Tìm trong username
      { fullName: { $regex: search, $options: 'i' } },  // Tìm trong họ tên
      { studentId: { $regex: search, $options: 'i' } }  // Tìm trong MSSV
    ];
  }
  
  // Lọc theo role (admin, teacher, student)
  if (role) {
    filter.role = role;
  }
  
  // Lọc theo trạng thái hoạt động (true/false)
  if (typeof isActive === 'boolean') {
    filter.isActive = isActive;
  }

  // Đếm tổng số users thỏa mãn filter (cho pagination)
  const total = await User.countDocuments(filter);

  // Lấy users với pagination - Sử dụng aggregation để đảm bảo admin luôn ở đầu
  const users = await User.aggregate([
    { $match: filter },                                    // Lọc theo filter
    { $addFields: { 
        sortPriority: { 
          // Thêm field sortPriority: 0 cho admin, 1 cho các role khác
          $cond: [{ $eq: ['$role', 'admin'] }, 0, 1] 
        } 
      } 
    },
    { $sort: { sortPriority: 1, createdAt: -1 } },        // Sắp xếp: admin trước (0), sau đó mới nhất
    { $skip: (page - 1) * limit },                         // Bỏ qua các bản ghi ở trang trước
    { $limit: limit },                                     // Giới hạn số lượng
    { $project: { password: 0, sortPriority: 0 } }       // Loại bỏ password và sortPriority khỏi kết quả
  ]);
  
  // Format lại _id để tương thích với frontend
  const formattedUsers = users.map((user: any) => ({
    ...user,
    _id: user._id
  }));

  res.json({
    success: true,
    data: {
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// ============================================
// GET USER - Lấy chi tiết một user
// ============================================
/**
 * Lấy thông tin chi tiết một user theo ID
 * Route: GET /api/users/:id
 * Access: Private (Admin)
 */
// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin)
export const getUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User not found'
    });
    return;
  }

  res.json({
    success: true,
    data: { user }
  });
});

// ============================================
// CREATE USER - Tạo user mới (Admin)
// ============================================
/**
 * Tạo user mới (chỉ Admin mới có quyền)
 * Route: POST /api/users
 * Access: Private (Admin)
 * 
 * Required fields: email, username, password, role
 * Optional fields: fullName, studentId, class, gender, isActive
 */
// @desc    Create user (Admin only)
// @route   POST /api/users
// @access  Private (Admin)
export const createUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, username, password, role, fullName, studentId, class: className, gender, isActive } = req.body;

  // Kiểm tra các trường bắt buộc
  if (!email || !username || !password || !role) {
    res.status(400).json({
      success: false,
      message: 'Email, username, password, and role are required'
    });
    return;
  }

  // Kiểm tra user đã tồn tại chưa (theo email hoặc username)
  const existingUser = await User.findOne({
    $or: [
      { email: email.toLowerCase().trim() },
      { username: username.trim() }
    ]
  });

  if (existingUser) {
    res.status(400).json({
      success: false,
      message: 'User with this email or username already exists'
    });
    return;
  }

  // Mã hóa mật khẩu bằng bcrypt
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user = await User.create({
    email: email.toLowerCase().trim(),
    username: username.trim(),
    password: hashedPassword,
    role,
    fullName: fullName?.trim(),
    studentId: studentId?.trim(),
    class: className?.trim(),
    gender,
    isActive: typeof isActive === 'boolean' ? isActive : true,
    isEmailVerified: false
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        fullName: (user as any).fullName,
        studentId: (user as any).studentId,
        class: (user as any).class,
        gender: (user as any).gender,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    }
  });
});

// ============================================
// DELETE USER - Xóa user (Admin)
// ============================================
/**
 * Xóa user (chỉ Admin mới có quyền)
 * Route: DELETE /api/users/:id
 * Access: Private (Admin)
 * 
 * Security:
 * - Admin không thể xóa chính mình
 * - Admin không thể xóa admin khác
 */
// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private (Admin)
export const deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.id;
  const requester: any = req.user;

  // Ngăn admin xóa chính tài khoản của mình
  if (requester?.id === userId) {
    res.status(400).json({
      success: false,
      message: 'You cannot delete your own account'
    });
    return;
  }

  // Tìm user cần xóa
  const user = await User.findById(userId);
  
  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User not found'
    });
    return;
  }

  // Ngăn xóa admin khác (bảo vệ an toàn)
  if (user.role === 'admin' && requester?.id !== userId) {
    res.status(403).json({
      success: false,
      message: 'Cannot delete admin user'
    });
    return;
  }

  await User.findByIdAndDelete(userId);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

// ============================================
// UPDATE USER - Cập nhật user
// ============================================
/**
 * Cập nhật thông tin user
 * Route: PUT /api/users/:id
 * Access: Private (Admin or Self)
 * 
 * Phân quyền:
 * - Admin: Có thể cập nhật tất cả fields (kể cả password, role, isActive)
 * - Self: Chỉ có thể cập nhật profile fields (fullName, phone, class, avatar, gender)
 * 
 * Admin có thể cập nhật:
 * - fullName, phone, class, avatar, gender
 * - username, email, studentId, role, isActive
 * - password (sẽ được hash)
 * 
 * Self chỉ có thể cập nhật:
 * - fullName, phone, class, avatar, gender
 */
// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin or Self)
export const updateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Lấy dữ liệu từ body (có thể từ req.body.profile hoặc req.body trực tiếp)
  const source = (req.body && req.body.profile) ? req.body.profile : req.body;
  const requester: any = req.user;
  const isAdmin = requester?.role === 'admin';
  
  // Quy định fields có thể cập nhật:
  // - Self (user tự cập nhật): fullName, phone, class, avatar, gender
  // - Admin: Tất cả fields (kể cả username, email, role, isActive, password)
  const updateData: any = {};
  
  if (isAdmin) {
    // Admin có quyền cập nhật tất cả fields
    const adminAllowedFields = ['fullName', 'phone', 'class', 'avatar', 'gender', 'username', 'email', 'studentId', 'role', 'isActive', 'password'];
    
    // Chỉ thêm các field có giá trị vào updateData
    for (const key of adminAllowedFields) {
      if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
        updateData[key] = source[key];
      }
    }
    
    // Xử lý isActive từ body trực tiếp (không nằm trong profile)
    if (typeof req.body?.isActive === 'boolean') {
      updateData.isActive = req.body.isActive;
    }
    
    // Xử lý đổi mật khẩu bởi admin (hash password trước khi lưu)
    if (source?.password && typeof source.password === 'string' && source.password.length > 0) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(source.password, salt);
    }
  } else {
    // User tự cập nhật chỉ được phép các fields sau
    const allowed: Array<keyof typeof source> = ['fullName', 'phone', 'class', 'avatar', 'gender'];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
        updateData[key] = source[key];
      }
    }
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User not found'
    });
    return;
  }

  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user }
  });
});