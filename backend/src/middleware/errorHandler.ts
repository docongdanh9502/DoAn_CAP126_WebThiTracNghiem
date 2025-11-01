// ============================================
// FILE: errorHandler.ts
// MÔ TẢ: Middleware xử lý lỗi tập trung cho toàn bộ ứng dụng
// CHỨC NĂNG: Bắt và xử lý các lỗi từ controllers, trả về response thống nhất
// ============================================

import { Request, Response, NextFunction } from 'express'; // Types từ Express

// ============================================
// INTERFACE APP ERROR
// ============================================
/**
 * Interface mở rộng Error để thêm statusCode và isOperational
 */
export interface AppError extends Error {
  statusCode?: number;      // HTTP status code (404, 400, 500, etc.)
  isOperational?: boolean;  // Đánh dấu lỗi có phải là operational error không
}

// ============================================
// ERROR HANDLER - Xử lý lỗi tập trung
// ============================================
/**
 * Middleware xử lý tất cả lỗi trong ứng dụng
 * - Xác định loại lỗi (MongoDB, JWT, Validation, etc.)
 * - Trả về response với status code và message phù hợp
 * - Log stack trace trong môi trường development
 */
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log lỗi ra console để debug
  console.error(err);

  // Lỗi MongoDB: ObjectId không hợp lệ (ví dụ: ID không đúng format)
  if (err.name === 'CastError') {
    const message = 'Resource not found'; // Resource không tìm thấy
    error = { message, statusCode: 404 } as AppError;
  }

  // Lỗi MongoDB: Duplicate key (ví dụ: email đã tồn tại)
  if (err.name === 'MongoError' && (err as any).code === 11000) {
    const message = 'Duplicate field value entered'; // Giá trị trùng lặp
    error = { message, statusCode: 400 } as AppError;
  }

  // Lỗi MongoDB: Validation error (ví dụ: thiếu required field)
  if (err.name === 'ValidationError') {
    // Lấy tất cả các validation errors và nối thành chuỗi
    const message = Object.values((err as any).errors).map((val: any) => val.message).join(', ');
    error = { message, statusCode: 400 } as AppError;
  }

  // Lỗi JWT: Token không hợp lệ
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 } as AppError;
  }

  // Lỗi JWT: Token đã hết hạn
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 } as AppError;
  }

  // Trả về response với status code và message lỗi
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error', // Message lỗi
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) // Chỉ hiển thị stack trace trong development
  });
};

// ============================================
// NOT FOUND HANDLER - Xử lý route không tồn tại
// ============================================
/**
 * Middleware xử lý khi route không tồn tại (404)
 * - Được đặt ở cuối cùng sau tất cả routes
 * - Tạo error và chuyển sang errorHandler
 */
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not found - ${req.originalUrl}`) as AppError;
  error.statusCode = 404;
  next(error); // Chuyển error sang errorHandler
};

// ============================================
// ASYNC HANDLER - Wrapper cho async functions
// ============================================
/**
 * Wrapper để bắt lỗi tự động cho các async controller functions
 * - Thay vì dùng try-catch trong mỗi controller
 * - Tự động chuyển lỗi sang errorHandler middleware
 * 
 * @param fn - Async function (controller) cần wrap
 * @returns Middleware function đã được wrap
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  // Chuyển async function thành Promise và bắt lỗi tự động
  Promise.resolve(fn(req, res, next)).catch(next);
};