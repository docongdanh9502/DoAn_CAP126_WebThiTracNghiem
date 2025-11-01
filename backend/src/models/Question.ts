// ============================================
// FILE: Question.ts
// MÔ TẢ: Model định nghĩa cấu trúc dữ liệu Question (Câu hỏi) trong MongoDB
// CHỨC NĂNG: Schema và Interface cho Question collection
// ============================================

import mongoose, { Document, Schema } from 'mongoose'; // Mongoose để làm việc với MongoDB

// ============================================
// INTERFACE IQuestion - Định nghĩa type cho Question
// ============================================
/**
 * Interface mô tả cấu trúc dữ liệu của Question trong database
 * Kế thừa từ Document của Mongoose
 */
export interface IQuestion extends Document {
  text: string;                              // Nội dung câu hỏi (required)
  options: string[];                         // Mảng các phương án trả lời (A, B, C, D)
  correctAnswer: number;                     // Chỉ số của đáp án đúng (0=A, 1=B, 2=C, 3=D)
  subject: string;                           // Môn học/chủ đề (required)
  difficulty: 'easy' | 'medium' | 'hard';  // Độ khó: dễ, trung bình, khó (default: medium)
  createdBy: mongoose.Types.ObjectId;        // ID của user tạo câu hỏi (reference đến User)
  createdAt: Date;                           // Ngày tạo (tự động thêm bởi timestamps)
  updatedAt: Date;                           // Ngày cập nhật cuối (tự động thêm bởi timestamps)
}

// ============================================
// QUESTION SCHEMA - Định nghĩa cấu trúc database
// ============================================
const QuestionSchema = new Schema<IQuestion>({
  // Nội dung câu hỏi: bắt buộc
  text: {
    type: String,
    required: true
  },
  
  // Mảng các phương án trả lời: bắt buộc, mỗi phương án là một string
  options: [{
    type: String,
    required: true
  }],
  
  // Đáp án đúng: bắt buộc, giá trị >= 0 (0=A, 1=B, 2=C, 3=D)
  correctAnswer: {
    type: Number,
    required: true,
    min: 0                                   // Giá trị tối thiểu là 0
  },
  
  // Môn học/chủ đề: bắt buộc
  subject: {
    type: String,
    required: true
  },
  
  // Độ khó: chỉ cho phép 3 giá trị, mặc định 'medium'
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],       // Chỉ chấp nhận các giá trị này
    default: 'medium'                        // Mặc định là trung bình
  },
  
  // Người tạo: reference đến User model, bắt buộc
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',                             // Liên kết đến collection User
    required: true
  }
}, {
  timestamps: true // Tự động thêm createdAt và updatedAt
});

// ============================================
// EXPORT MODEL
// ============================================
// Export model 'Question' với schema QuestionSchema để sử dụng trong controllers
export default mongoose.model<IQuestion>('Question', QuestionSchema);