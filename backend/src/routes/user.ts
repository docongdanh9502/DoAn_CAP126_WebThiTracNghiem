// ============================================
// FILE: user.ts
// MÔ TẢ: Routes cho quản lý users (chỉ Admin hoặc Self)
// CHỨC NĂNG: Định nghĩa các endpoints CRUD cho User
// ============================================

import express from 'express'; // Express Router
import {
  getUsers,    // Controller lấy danh sách users
  getUser,     // Controller lấy chi tiết một user
  createUser,  // Controller tạo user mới
  updateUser,  // Controller cập nhật user
  deleteUser   // Controller xóa user
} from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth'; // Middleware xác thực và phân quyền

const router = express.Router();

// ============================================
// ADMIN ROUTES - Chỉ Admin mới có quyền
// ============================================

// Lấy danh sách tất cả users (có pagination, search, filter)
// Route: GET /api/users
// Access: Private (Admin only)
// Middleware: authenticate (xác thực JWT) + authorize('admin') (chỉ admin)
router.get('/', authenticate, authorize('admin'), getUsers);

// Tạo user mới
// Route: POST /api/users
// Access: Private (Admin only)
// Middleware: authenticate + authorize('admin')
router.post('/', authenticate, authorize('admin'), createUser);

// Lấy chi tiết một user theo ID
// Route: GET /api/users/:id
// Access: Private (Admin only)
// Middleware: authenticate + authorize('admin')
router.get('/:id', authenticate, authorize('admin'), getUser);

// Xóa user
// Route: DELETE /api/users/:id
// Access: Private (Admin only)
// Middleware: authenticate + authorize('admin')
// Note: Admin không thể xóa chính mình và không thể xóa admin khác
router.delete('/:id', authenticate, authorize('admin'), deleteUser);

// ============================================
// ADMIN OR SELF ROUTES - Admin hoặc chính user đó
// ============================================

// Cập nhật user
// Route: PUT /api/users/:id
// Access: Private (Admin or Self)
// Middleware: authenticate + custom middleware (kiểm tra admin hoặc self)
// Note:
// - Admin có thể cập nhật tất cả fields (kể cả password, role, isActive)
// - Self chỉ có thể cập nhật profile fields (fullName, phone, class, avatar, gender)
router.put(
  '/:id',
  authenticate, // Xác thực JWT token
  (req, res, next) => {
    // Cho phép admin hoặc chính user đó cập nhật
    const isAdmin = (req as any).user?.role === 'admin';
    const isSelf = (req as any).user?.id === req.params.id;
    if (isAdmin || isSelf) return next(); // Cho phép tiếp tục
    // Từ chối nếu không phải admin và không phải chính user đó
    return res.status(403).json({ success: false, message: 'Access denied. Insufficient permission' });
  },
  updateUser
);

export default router;