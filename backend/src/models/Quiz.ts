// ============================================
// FILE: Quiz.ts
// MÔ TẢ: Model định nghĩa cấu trúc dữ liệu Quiz (Bài thi) trong MongoDB
// CHỨC NĂNG: Schema và Interface cho Quiz collection
// ============================================

import mongoose, { Document, Schema } from 'mongoose'; // Mongoose để làm việc với MongoDB

// ============================================
// INTERFACE IQuiz - Định nghĩa type cho Quiz
// ============================================
/**
 * Interface mô tả cấu trúc dữ liệu của Quiz trong database
 * Kế thừa từ Document của Mongoose
 */
export interface IQuiz extends Document {
  title: string;                            // Tiêu đề bài thi (required)
  description: string;                      // Mô tả bài thi (required)
  subject: string;                          // Môn học/chủ đề (required)
  timeLimit: number;                        // Thời gian làm bài (phút, required, min: 1)
  questions: string[];                      // Mảng ID các câu hỏi (references đến Question)
  isActive: boolean;                        // Bài thi có đang hoạt động không (default: true)
  createdBy: mongoose.Types.ObjectId;       // ID của user tạo bài thi (reference đến User)
  createdAt: Date;                          // Ngày tạo (tự động thêm bởi timestamps)
  updatedAt: Date;                          // Ngày cập nhật cuối (tự động thêm bởi timestamps)
}

// ============================================
// QUIZ SCHEMA - Định nghĩa cấu trúc database
// ============================================
const QuizSchema = new Schema<IQuiz>({
  // Tiêu đề bài thi: bắt buộc
  title: {
    type: String,
    required: true,
    trim: true                              // Loại bỏ khoảng trắng đầu cuối
  },
  
  // Mô tả bài thi: bắt buộc
  description: {
    type: String,
    required: true
  },
  
  // Môn học/chủ đề: bắt buộc
  subject: {
    type: String,
    required: true
  },
  
  // Thời gian làm bài: bắt buộc, tối thiểu 1 phút
  timeLimit: {
    type: Number,
    required: true,
    min: 1                                  // Ít nhất 1 phút
  },
  
  // Mảng các câu hỏi: references đến Question collection
  questions: [{
    type: Schema.Types.ObjectId,
    ref: 'Question'                         // Liên kết đến collection Question
  }],
  
  // Trạng thái hoạt động: mặc định true
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Người tạo: reference đến User model, bắt buộc
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',                            // Liên kết đến collection User
    required: true
  }
}, {
  timestamps: true // Tự động thêm createdAt và updatedAt
});

// ============================================
// EXPORT MODEL
// ============================================
// Export model 'Quiz' với schema QuizSchema để sử dụng trong controllers
export default mongoose.model<IQuiz>('Quiz', QuizSchema);