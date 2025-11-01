// ============================================
// FILE: jwt.ts
// MÔ TẢ: Cấu hình và xử lý JWT (JSON Web Token) cho authentication
// CHỨC NĂNG: Tạo token, xác thực token, giải mã token
// ============================================

import jwt, { SignOptions } from 'jsonwebtoken'; // Thư viện JWT

// ============================================
// INTERFACE JWT PAYLOAD
// ============================================
/**
 * Cấu trúc dữ liệu được lưu trong JWT token
 */
export interface JwtPayload {
  userId: string;                              // ID của user trong database
  email: string;                               // Email của user
  role: 'admin' | 'teacher' | 'student';      // Vai trò của user
  iat?: number;                                // Thời gian tạo token (Issued At)
  exp?: number;                                // Thời gian hết hạn token (Expiration)
}

// ============================================
// TẠO JWT TOKEN
// ============================================
/**
 * Tạo JWT token từ thông tin user
 * @param payload - Thông tin user (userId, email, role)
 * @returns JWT token string
 */
export const generateToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
    // Cấu hình options cho token
    const options: SignOptions = {
        expiresIn: (process.env.JWT_EXPIRE || '7d') as any // Thời gian hết hạn (mặc định 7 ngày)
    };
    
    // Ký và tạo token với secret key từ biến môi trường
    return jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', options);
};

// ============================================
// XÁC THỰC JWT TOKEN
// ============================================
/**
 * Xác thực và giải mã JWT token
 * - Kiểm tra token có hợp lệ không (signature, expiration)
 * - Nếu hợp lệ, trả về payload chứa thông tin user
 * @param token - JWT token string
 * @returns JwtPayload nếu token hợp lệ
 * @throws Error nếu token không hợp lệ hoặc đã hết hạn
 */
export const verifyToken = (token: string): JwtPayload => {
  // Xác thực token với secret key và trả về payload
  return jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as JwtPayload;
};

// ============================================
// GIẢI MÃ JWT TOKEN (KHÔNG XÁC THỰC)
// ============================================
/**
 * Giải mã JWT token mà không xác thực signature
 * - Dùng để đọc thông tin từ token mà không cần kiểm tra tính hợp lệ
 * - Không nên dùng để xác thực, chỉ để đọc thông tin
 * @param token - JWT token string
 * @returns JwtPayload nếu decode thành công, null nếu lỗi
 */
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    // Giải mã token mà không xác thực
    return jwt.decode(token) as JwtPayload;
  } catch (error) {
    // Nếu lỗi, trả về null
    return null;
  }
};