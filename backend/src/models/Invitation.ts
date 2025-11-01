// ============================================
// FILE: Invitation.ts
// MÔ TẢ: Model định nghĩa cấu trúc dữ liệu Invitation (Lời mời tham gia thi) trong MongoDB
// CHỨC NĂNG: Schema và Interface cho Invitation collection - Lưu thông tin lời mời tham gia thi qua email/token
// ============================================

import mongoose, { Document, Schema } from 'mongoose'; // Mongoose để làm việc với MongoDB

// ============================================
// INTERFACE IInvitation - Định nghĩa type cho Invitation
// ============================================
/**
 * Interface mô tả cấu trúc dữ liệu của Invitation trong database
 * Kế thừa từ Document của Mongoose
 * Lưu thông tin lời mời tham gia thi (có thể dùng token để truy cập)
 */
export interface IInvitation extends Document {
  quiz: mongoose.Types.ObjectId;   // ID của bài thi (reference đến Quiz)
  email: string;                   // Email của sinh viên được mời
  studentName: string;             // Tên sinh viên
  studentId: string;               // MSSV
  token: string;                   // Token để truy cập bài thi (unique)
  isUsed: boolean;                // Đã sử dụng token chưa (default: false)
  expiresAt: Date;                // Thời gian hết hạn (default: 24 giờ)
  createdAt: Date;                 // Ngày tạo (tự động thêm bởi timestamps)
}

const InvitationSchema = new Schema<IInvitation>({
  quiz: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  studentId: {
    type: String,
    required: true,
    trim: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  }
}, {
  timestamps: true
});

// Index for better performance
InvitationSchema.index({ token: 1 });
InvitationSchema.index({ email: 1 });
InvitationSchema.index({ quiz: 1 });
InvitationSchema.index({ isUsed: 1 });
InvitationSchema.index({ expiresAt: 1 });

export default mongoose.model<IInvitation>('Invitation', InvitationSchema);