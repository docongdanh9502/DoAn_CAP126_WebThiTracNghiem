// ============================================
// FILE: initAdmin.ts
// MÔ TẢ: Tự động tạo tài khoản admin mặc định khi server khởi động
// CHỨC NĂNG: Kiểm tra và tạo admin user nếu chưa có trong hệ thống
// ============================================

import bcrypt from 'bcryptjs'; // Thư viện mã hóa mật khẩu
import User from '../models/User'; // Model User từ MongoDB

/**
 * Tạo tài khoản admin mặc định khi server khởi động
 * - Chỉ tạo nếu chưa có admin nào trong hệ thống
 * - Đọc thông tin admin từ biến môi trường (.env) hoặc dùng giá trị mặc định
 * - Mật khẩu được hash bằng bcrypt trước khi lưu vào database
 */
export const initAdmin = async (): Promise<void> => {
  try {
    // Kiểm tra xem đã có admin trong hệ thống chưa
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    // Nếu đã có admin, không cần tạo mới
    if (existingAdmin) {
      return;
    }

    // Lấy thông tin admin từ biến môi trường, nếu không có thì dùng giá trị mặc định
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@quizplatform.com';      // Email admin
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';                  // Username admin
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';              // Mật khẩu admin
    const adminFullName = process.env.ADMIN_FULLNAME || 'System Administrator';  // Tên đầy đủ

    // Mã hóa mật khẩu bằng bcrypt với salt rounds = 10
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Tạo tài khoản admin mới trong database
    await User.create({
      email: adminEmail.toLowerCase().trim(),      // Email viết thường và loại bỏ khoảng trắng
      username: adminUsername.trim(),              // Username loại bỏ khoảng trắng
      password: hashedPassword,                    // Mật khẩu đã được hash
      role: 'admin',                               // Vai trò là admin
      fullName: adminFullName,                     // Tên đầy đủ
      isEmailVerified: true,                      // Đánh dấu email đã xác thực
      isActive: true                              // Tài khoản đang hoạt động
    });
  } catch (error: any) {
    // Bỏ qua lỗi duplicate key (nếu admin đã tồn tại do unique constraint)
    if (error.code === 11000) {
      return;
    }
    // Không log lỗi để tránh làm rối console
  }
};

