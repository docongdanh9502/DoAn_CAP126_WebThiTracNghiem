import express from 'express';
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserStats
} from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/', authenticate, authorize('admin'), getUsers);

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private (Admin)
router.get('/stats', authenticate, authorize('admin'), getUserStats);

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private (Admin)
router.get('/:id', authenticate, authorize('admin'), getUser);

// @route   PUT /api/users/:id
// @desc    Update user (admin or self)
// @access  Private
router.put(
  '/:id',
  authenticate,
  (req, res, next) => {
    // Allow admin or the user themselves
    const isAdmin = (req as any).user?.role === 'admin';
    const isSelf = (req as any).user?.id === req.params.id;
    if (isAdmin || isSelf) return next();
    return res.status(403).json({ success: false, message: 'Access denied. Insufficient permission' });
  },
  updateUser
);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('admin'), deleteUser);

export default router;