// ============================================
// FILE: QuizResult.ts
// MÔ TẢ: Model định nghĩa cấu trúc dữ liệu QuizResult (Kết quả bài thi) trong MongoDB
// CHỨC NĂNG: Schema và Interface cho QuizResult collection - Lưu kết quả khi sinh viên nộp bài
// ============================================

import mongoose, { Document, Schema } from 'mongoose'; // Mongoose để làm việc với MongoDB

// ============================================
// INTERFACE IQuizResult - Định nghĩa type cho QuizResult
// ============================================
/**
 * Interface mô tả cấu trúc dữ liệu của QuizResult trong database
 * Kế thừa từ Document của Mongoose
 * Lưu kết quả bài thi của sinh viên, bao gồm đáp án và điểm số
 */
export interface IQuizResult extends Document {
  quizId: mongoose.Types.ObjectId;          // ID của bài thi (reference đến Quiz)
  studentId: mongoose.Types.ObjectId;       // ID của sinh viên (reference đến User)
  assignmentId?: mongoose.Types.ObjectId;   // ID của assignment (nếu làm từ assignment, optional)
  
  // Snapshot của thông tin sinh viên tại thời điểm nộp bài (để tránh mất dữ liệu khi profile thay đổi)
  studentCode?: string;                     // MSSV tại thời điểm nộp bài (optional)
  fullName?: string;                        // Họ tên tại thời điểm nộp bài (optional)
  className?: string;                       // Lớp tại thời điểm nộp bài (optional)
  gender?: 'male' | 'female' | 'other';     // Giới tính tại thời điểm nộp bài (optional)
  
  answers: number[];                        // Mảng các đáp án sinh viên đã chọn (0=A, 1=B, 2=C, 3=D)
  score: number;                           // Điểm số (required, min: 0)
  totalQuestions: number;                  // Tổng số câu hỏi (required, min: 1)
  timeSpent: number;                       // Thời gian làm bài (phút, required, min: 0)
  completedAt: Date;                        // Thời điểm hoàn thành/nộp bài (required)
  createdAt: Date;                         // Ngày tạo (tự động thêm bởi timestamps)
}

// ============================================
// QUIZ RESULT SCHEMA - Định nghĩa cấu trúc database
// ============================================
const QuizResultSchema = new Schema<IQuizResult>({
  // ID bài thi: reference đến Quiz, bắt buộc
  quizId: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',                            // Liên kết đến collection Quiz
    required: true
  },
  
  // ID sinh viên: reference đến User, bắt buộc
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',                            // Liên kết đến collection User
    required: true
  },
  
  // ID assignment: reference đến Assignment, không bắt buộc
  assignmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Assignment',                     // Liên kết đến collection Assignment
    required: false
  },
  
  // ============================================
  // SNAPSHOT FIELDS - Lưu thông tin tại thời điểm nộp bài
  // ============================================
  // Lý do: Khi sinh viên thay đổi thông tin (tên, lớp, MSSV), kết quả bài thi vẫn giữ nguyên thông tin cũ
  studentCode: { type: String, trim: true },  // MSSV snapshot
  fullName: { type: String, trim: true },     // Họ tên snapshot
  className: { type: String, trim: true },     // Lớp snapshot
  gender: { type: String, enum: ['male', 'female', 'other'] }, // Giới tính snapshot
  
  // Mảng các đáp án sinh viên đã chọn: mỗi phần tử là chỉ số (0=A, 1=B, 2=C, 3=D)
  answers: [{
    type: Number,
    required: true
  }],
  
  // Điểm số: bắt buộc, tối thiểu 0
  score: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Tổng số câu hỏi: bắt buộc, tối thiểu 1
  totalQuestions: {
    type: Number,
    required: true,
    min: 1
  },
  
  // Thời gian làm bài: bắt buộc, tối thiểu 0 phút
  timeSpent: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Thời điểm hoàn thành/nộp bài: bắt buộc
  completedAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true // Tự động thêm createdAt và updatedAt
});

// ============================================
// INDEXES - Tối ưu hiệu suất truy vấn
// ============================================
// Composite index: tìm kết quả theo quiz, student và assignment nhanh hơn
QuizResultSchema.index({ quizId: 1, studentId: 1, assignmentId: 1 });

// Index: tìm tất cả kết quả của một sinh viên nhanh hơn
QuizResultSchema.index({ studentId: 1 });

// Index: sắp xếp theo thời gian hoàn thành nhanh hơn
QuizResultSchema.index({ completedAt: 1 });

// ============================================
// EXPORT MODEL
// ============================================
// Export model 'QuizResult' với schema QuizResultSchema để sử dụng trong controllers
export default mongoose.model<IQuizResult>('QuizResult', QuizResultSchema);
