// ============================================
// FILE: Exam.ts
// MÔ TẢ: Model định nghĩa cấu trúc dữ liệu Exam (Kỳ thi) trong MongoDB
// CHỨC NĂNG: Schema và Interface cho Exam collection - Lưu thông tin kỳ thi (có thể dùng với Invitation)
// ============================================

import mongoose, { Document, Schema } from 'mongoose'; // Mongoose để làm việc với MongoDB

// ============================================
// INTERFACE IExam - Định nghĩa type cho Exam
// ============================================
/**
 * Interface mô tả cấu trúc dữ liệu của Exam trong database
 * Kế thừa từ Document của Mongoose
 * Lưu thông tin kỳ thi (có thể được tạo từ Invitation)
 */
export interface IExam extends Document {
  quiz: mongoose.Types.ObjectId;              // ID của bài thi (reference đến Quiz)
  invitation: mongoose.Types.ObjectId;         // ID của invitation (reference đến Invitation)
  studentInfo: {                               // Thông tin sinh viên tại thời điểm thi
    name: string;                             // Tên sinh viên
    studentId: string;                         // MSSV
    email: string;                             // Email
  };
  startTime: Date;                            // Thời gian bắt đầu thi
  endTime?: Date;                             // Thời gian kết thúc thi (optional)
  status: 'pending' | 'in-progress' | 'completed' | 'expired'; // Trạng thái kỳ thi
  answers: {                                  // Mảng câu trả lời
    questionId: mongoose.Types.ObjectId;      // ID câu hỏi
    answer: any;                              // Câu trả lời
    isCorrect: boolean;                      // Đúng hay sai
    points: number;                           // Điểm số
  }[];
  totalScore: number;                         // Tổng điểm
  submittedAt?: Date;                         // Thời gian nộp bài (optional)
  createdAt: Date;                            // Ngày tạo (tự động thêm bởi timestamps)
  updatedAt: Date;                            // Ngày cập nhật cuối (tự động thêm bởi timestamps)
}

const ExamSchema = new Schema<IExam>({
  quiz: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  invitation: {
    type: Schema.Types.ObjectId,
    ref: 'Invitation',
    required: true
  },
  studentInfo: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    studentId: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    }
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'expired'],
    default: 'pending'
  },
  answers: [{
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    answer: {
      type: Schema.Types.Mixed,
      required: true
    },
    isCorrect: {
      type: Boolean,
      required: true
    },
    points: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  totalScore: {
    type: Number,
    default: 0,
    min: 0
  },
  submittedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better performance
ExamSchema.index({ quiz: 1 });
ExamSchema.index({ invitation: 1 });
ExamSchema.index({ 'studentInfo.email': 1 });
ExamSchema.index({ status: 1 });
ExamSchema.index({ startTime: 1 });

export default mongoose.model<IExam>('Exam', ExamSchema);