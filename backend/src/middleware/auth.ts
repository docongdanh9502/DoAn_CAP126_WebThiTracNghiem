// ============================================
// FILE: auth.ts
// MÔ TẢ: Middleware xác thực và phân quyền người dùng
// CHỨC NĂNG: Xác thực JWT token, kiểm tra quyền truy cập theo role
// ============================================

import { Request, Response, NextFunction } from 'express'; // Types từ Express
import { verifyToken, JwtPayload } from '../config/jwt';   // Hàm xác thực JWT token
import User, { IUser } from '../models/User';              // Model User

// ============================================
// MỞ RỘNG INTERFACE REQUEST CỦA EXPRESS
// ============================================
// Thêm thuộc tính 'user' vào object Request để lưu thông tin user sau khi xác thực
declare global {
  namespace Express {
    interface Request {
      user?: IUser; // Thông tin user đã được xác thực
    }
  }
}

// ============================================
// MIDDLEWARE XÁC THỰC NGƯỜI DÙNG (AUTHENTICATION)
// ============================================
/**
 * Xác thực JWT token từ request header
 * - Đọc token từ header Authorization
 * - Giải mã token để lấy userId
 * - Tìm user trong database và kiểm tra tài khoản có đang hoạt động không
 * - Nếu hợp lệ, gán user vào req.user để các middleware/controller sau sử dụng
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Lấy JWT token từ header Authorization (format: "Bearer <token>")
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    // Nếu không có token, từ chối truy cập
    if (!token) {
      res.status(401).json({ message: 'Access denied. No token provided.' });
      return;
    }

    // Giải mã token để lấy thông tin userId
    const decoded = verifyToken(token);
    
    // Tìm user trong database (loại bỏ password field)
    const user = await User.findById(decoded.userId).select('-password');
    
    // Nếu không tìm thấy user, token không hợp lệ
    if (!user) {
      res.status(401).json({ message: 'Invalid token.' });
      return;
    }

    // Kiểm tra tài khoản có đang hoạt động không
    if (!user.isActive) {
      res.status(401).json({ message: 'Account is deactivated.' });
      return;
    }

    // Gán thông tin user vào request object để sử dụng ở các middleware/controller sau
    req.user = user;
    
    // Chuyển sang middleware/controller tiếp theo
    next();
  } catch (error) {
    // Nếu token không hợp lệ hoặc đã hết hạn
    res.status(401).json({ message: 'Invalid token.' });
    return;
  }
};

// ============================================
// MIDDLEWARE PHÂN QUYỀN (AUTHORIZATION)
// ============================================
/**
 * Kiểm tra quyền truy cập dựa trên role của user
 * - Chỉ cho phép các role được chỉ định truy cập
 * - Ví dụ: authorize('admin', 'teacher') chỉ cho admin và teacher truy cập
 * 
 * @param roles - Mảng các role được phép truy cập (ví dụ: ['admin', 'teacher'])
 * @returns Middleware function
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Kiểm tra đã xác thực user chưa (phải gọi authenticate trước)
    if (!req.user) {
      res.status(401).json({ message: 'Access denied. No user found.' });
      return;
    }

    // Kiểm tra role của user có trong danh sách role được phép không
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
      return;
    }

    // Nếu có quyền, cho phép truy cập
    next();
  };
};

// ============================================
// MIDDLEWARE XÁC THỰC TÙY CHỌN (OPTIONAL AUTH)
// ============================================
/**
 * Xác thực user nếu có token, nhưng không bắt buộc
 * - Khác với authenticate: nếu không có token hoặc token không hợp lệ vẫn cho phép tiếp tục
 * - Dùng cho các route công khai nhưng vẫn muốn biết user nào đang truy cập (nếu có)
 * - Ví dụ: xem danh sách bài thi công khai, nhưng nếu đã đăng nhập thì hiển thị thêm thông tin
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Lấy token từ header (nếu có)
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    // Nếu có token, thử xác thực
    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('-password');
      
      // Nếu tìm thấy user và tài khoản đang hoạt động, gán vào req.user
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    // Luôn cho phép tiếp tục (không bắt buộc phải đăng nhập)
    next();
  } catch (error) {
    // Nếu có lỗi (token không hợp lệ), vẫn cho phép tiếp tục
    next();
  }
};