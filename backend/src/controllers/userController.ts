import { Request, Response } from 'express';
import User from '../models/User';
import { asyncHandler } from '../middleware/errorHandler';

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin)
export const getUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const role = req.query.role as string;
  const search = req.query.search as string;

  let query: any = {};

  // Filter by role
  if (role) {
    query.role = role;
  }

  // Search by name or email
  if (search) {
    query.$or = [
      { 'profile.firstName': { $regex: search, $options: 'i' } },
      { 'profile.lastName': { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

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

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
export const updateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const source = (req.body && req.body.profile) ? req.body.profile : req.body;
  // Editable by self: fullName, phone, class, avatar, gender
  // Immutable by self: username, email, studentId, role
  const allowed: Array<keyof typeof source> = ['fullName', 'phone', 'class', 'avatar', 'gender'];

  const updateData: any = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      updateData[key] = source[key];
    }
  }

  // Only admin can update isActive
  const requester: any = (req as any).user;
  if (requester?.role === 'admin' && typeof req.body?.isActive === 'boolean') {
    updateData.isActive = req.body.isActive;
  }
  // Admin may change immutable identifiers if needed
  if (requester?.role === 'admin') {
    if (typeof source?.username === 'string') updateData.username = source.username;
    if (typeof source?.email === 'string') updateData.email = source.email;
    if (typeof source?.studentId === 'string') updateData.studentId = source.studentId;
    if (typeof source?.role === 'string') updateData.role = source.role;
  }

  // Debug log to trace updates (safe fields only)
  // eslint-disable-next-line no-console
  console.log('[USER] Update request', {
    userId: req.params.id,
    fields: Object.keys(updateData),
    avatarSize: typeof updateData.avatar === 'string' ? updateData.avatar.length : 0
  });

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

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
export const deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User not found'
    });
    return;
  }

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private (Admin)
export const getUserStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const totalUsers = await User.countDocuments();
  const totalAdmins = await User.countDocuments({ role: 'admin' });
  const totalTeachers = await User.countDocuments({ role: 'teacher' });
  const totalStudents = await User.countDocuments({ role: 'student' });
  const activeUsers = await User.countDocuments({ isActive: true });

  res.json({
    success: true,
    data: {
      totalUsers,
      totalAdmins,
      totalTeachers,
      totalStudents,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers
    }
  });
});