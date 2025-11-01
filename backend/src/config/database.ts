// ============================================
// FILE: database.ts
// MÔ TẢ: File cấu hình kết nối MongoDB và quản lý database connection
// CHỨC NĂNG: Kết nối MongoDB, xử lý events, tạo admin mặc định
// ============================================

import mongoose from 'mongoose';        // ODM (Object Data Modeling) cho MongoDB
import { initAdmin } from './initAdmin'; // Function tạo admin mặc định

// ============================================
// HÀM KẾT NỐI DATABASE
// ============================================
/**
 * Kết nối đến MongoDB database
 * - Đọc connection string từ biến môi trường MONGODB_URI
 * - Sau khi kết nối thành công, tự động tạo tài khoản admin mặc định
 */
export const connectDB = async (): Promise<void> => {
  try {
    // Kết nối đến MongoDB (hoặc MongoDB Atlas nếu có connection string)
    // Nếu không có MONGODB_URI, dùng localhost mặc định
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/online_quiz_system'
    );
    
    // Log thông báo kết nối thành công
    console.log(`📊 MongoDB Connected: ${conn.connection.host}`);
    
    // Sau khi kết nối database thành công, tạo tài khoản admin mặc định (nếu chưa có)
    await initAdmin();
  } catch (error) {
    // Nếu lỗi kết nối, log lỗi và thoát ứng dụng
    console.error('❌ Database connection error:', error);
    process.exit(1); // Thoát với mã lỗi
  }
};

// ============================================
// XỬ LÝ CÁC SỰ KIỆN KẾT NỐI
// ============================================

// Sự kiện khi đã kết nối thành công
mongoose.connection.on('connected', () => {
  console.log('📊 Mongoose connected to MongoDB');
});

// Sự kiện khi có lỗi kết nối
mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

// Sự kiện khi mất kết nối
mongoose.connection.on('disconnected', () => {
  console.log('📊 Mongoose disconnected from MongoDB');
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
// Xử lý khi ứng dụng được tắt (Ctrl+C, SIGINT signal)
// Đóng kết nối database một cách an toàn trước khi thoát
process.on('SIGINT', async () => {
  await mongoose.connection.close(); // Đóng kết nối MongoDB
  console.log('📊 MongoDB connection closed through app termination');
  process.exit(0); // Thoát với mã thành công
});