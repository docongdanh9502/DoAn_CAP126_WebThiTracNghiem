// ============================================
// FILE: Assignment.ts
// MÔ TẢ: Model định nghĩa cấu trúc dữ liệu Assignment (Giao bài thi) trong MongoDB
// CHỨC NĂNG: Schema và Interface cho Assignment collection - Lưu thông tin giáo viên giao bài cho sinh viên
// ============================================

import mongoose, { Document, Schema } from 'mongoose'; // Mongoose để làm việc với MongoDB

// ============================================
// INTERFACE IAssignment - Định nghĩa type cho Assignment
// ============================================
/**
 * Interface mô tả cấu trúc dữ liệu của Assignment trong database
 * Kế thừa từ Document của Mongoose
 * Lưu thông tin khi giáo viên giao bài thi cho sinh viên
 */
export interface IAssignment extends Document {
  quizId: mongoose.Types.ObjectId;       // ID của bài thi được giao (reference đến Quiz)
  assignedTo: string[];                   // Mảng email của các sinh viên được giao bài
  assignedBy: mongoose.Types.ObjectId;    // ID của giáo viên giao bài (reference đến User)
  dueDate: Date;                         // Hạn nộp bài (required)
  isActive: boolean;                     // Assignment có đang hoạt động không (default: true)
  createdAt: Date;                        // Ngày tạo (tự động thêm bởi timestamps)
  updatedAt: Date;                        // Ngày cập nhật cuối (tự động thêm bởi timestamps)
}

// ============================================
// ASSIGNMENT SCHEMA - Định nghĩa cấu trúc database
// ============================================
const AssignmentSchema = new Schema<IAssignment>({
  // ID bài thi: reference đến Quiz, bắt buộc
  quizId: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',                          // Liên kết đến collection Quiz
    required: true
  },
  
  // Mảng email của các sinh viên được giao bài: bắt buộc
  assignedTo: [{
    type: String,
    required: true                        // Mỗi email là bắt buộc
  }],
  
  // ID giáo viên giao bài: reference đến User, bắt buộc
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',                          // Liên kết đến collection User
    required: true
  },
  
  // Hạn nộp bài: bắt buộc
  dueDate: {
    type: Date,
    required: true
  },
  
  // Trạng thái hoạt động: mặc định true
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // Tự động thêm createdAt và updatedAt
});

// ============================================
// INDEXES - Tối ưu hiệu suất truy vấn
// ============================================
// Index: tìm assignments của một sinh viên (qua email) nhanh hơn
AssignmentSchema.index({ assignedTo: 1 });

// Index: tìm tất cả assignments do một giáo viên giao nhanh hơn
AssignmentSchema.index({ assignedBy: 1 });

// Index: sắp xếp hoặc lọc theo hạn nộp bài nhanh hơn
AssignmentSchema.index({ dueDate: 1 });

// ============================================
// EXPORT MODEL
// ============================================
// Export model 'Assignment' với schema AssignmentSchema để sử dụng trong controllers
export default mongoose.model<IAssignment>('Assignment', AssignmentSchema);
