// ============================================
// FILE: User.ts
// MÔ TẢ: Model định nghĩa cấu trúc dữ liệu User (Người dùng) trong MongoDB
// CHỨC NĂNG: Schema và Interface cho User collection
// ============================================

import mongoose, { Document, Schema } from 'mongoose'; // Mongoose để làm việc với MongoDB

// ============================================
// INTERFACE IUser - Định nghĩa type cho User
// ============================================
/**
 * Interface mô tả cấu trúc dữ liệu của User trong database
 * Kế thừa từ Document của Mongoose
 */
export interface IUser extends Document {
  email: string;                              // Email đăng nhập (unique, required)
  password: string;                           // Mật khẩu đã được hash (required, min 6 ký tự)
  role: 'admin' | 'teacher' | 'student';     // Vai trò: admin, giáo viên, hoặc sinh viên
  username: string;                           // Tên đăng nhập (required)
  fullName?: string;                         // Họ và tên đầy đủ (optional)
  studentId?: string;                        // Mã số sinh viên (cho sinh viên, optional)
  class?: string;                            // Lớp học (cho sinh viên, optional)
  avatar?: string;                           // Đường dẫn ảnh đại diện (optional)
  phone?: string;                             // Số điện thoại (optional)
  gender?: 'male' | 'female' | 'other';      // Giới tính (optional)
  isEmailVerified: boolean;                  // Email đã xác thực chưa (default: false)
  emailVerificationToken?: string;           // Token xác thực email (optional)
  isActive: boolean;                         // Tài khoản có đang hoạt động không (default: true)
  lastLogin?: Date;                         // Lần đăng nhập cuối cùng (optional)
  createdAt: Date;                           // Ngày tạo (tự động thêm bởi timestamps)
  updatedAt: Date;                           // Ngày cập nhật cuối (tự động thêm bởi timestamps)
  passwordResetOtp?: string;                // Mã OTP để reset mật khẩu (optional)
  passwordResetExpires?: Date;               // Thời gian hết hạn OTP (optional)
}

// ============================================
// USER SCHEMA - Định nghĩa cấu trúc database
// ============================================
const UserSchema = new Schema<IUser>({
  // Email: bắt buộc, duy nhất, tự động chuyển thành chữ thường
  email: {
    type: String,
    required: true,        // Bắt buộc phải có
    unique: true,          // Không được trùng lặp
    lowercase: true,       // Tự động chuyển thành chữ thường
    trim: true            // Loại bỏ khoảng trắng đầu cuối
  },
  
  // Mật khẩu: bắt buộc, tối thiểu 6 ký tự
  password: {
    type: String,
    required: true,
    minlength: 6          // Tối thiểu 6 ký tự
  },
  
  // Vai trò: chỉ cho phép 3 giá trị
  role: {
    type: String,
    enum: ['admin', 'teacher', 'student'], // Chỉ chấp nhận các giá trị này
    required: true
  },
  
  // Tên đăng nhập: bắt buộc
  username: {
    type: String,
    required: true,
    trim: true
  },
  
  // Họ và tên đầy đủ: không bắt buộc
  fullName: {
    type: String,
    trim: true
  },
  
  // Mã số sinh viên: không bắt buộc (chỉ cho sinh viên)
  studentId: {
    type: String,
    trim: true
  },
  
  // Lớp học: không bắt buộc (chỉ cho sinh viên)
  class: {
    type: String,
    trim: true
  },
  
  // Ảnh đại diện: mặc định rỗng
  avatar: {
    type: String,
    default: ''
  },
  
  // Số điện thoại: không bắt buộc
  phone: {
    type: String,
    trim: true
  },
  
  // Giới tính: chỉ cho phép 3 giá trị, mặc định undefined
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: undefined
  },
  
  // Email đã xác thực: mặc định false
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Token xác thực email: không bắt buộc
  emailVerificationToken: {
    type: String
  },
  
  // Tài khoản đang hoạt động: mặc định true
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Lần đăng nhập cuối cùng: không bắt buộc
  lastLogin: {
    type: Date
  },
  
  // Mã OTP reset mật khẩu: không bắt buộc
  passwordResetOtp: {
    type: String
  },
  
  // Thời gian hết hạn OTP: không bắt buộc
  passwordResetExpires: {
    type: Date
  }
}, {
  timestamps: true // Tự động thêm createdAt và updatedAt
});

// ============================================
// INDEX - Tối ưu hiệu suất truy vấn
// ============================================
// Tạo index cho trường role để tìm kiếm nhanh hơn
UserSchema.index({ role: 1 });

// ============================================
// EXPORT MODEL
// ============================================
// Export model 'User' với schema UserSchema để sử dụng trong controllers
export default mongoose.model<IUser>('User', UserSchema);