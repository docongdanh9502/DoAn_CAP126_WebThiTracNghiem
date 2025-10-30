import mongoose, { Document, Schema } from 'mongoose';

export interface IQuizResult extends Document {
  quizId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  assignmentId?: mongoose.Types.ObjectId; // Optional assignment ID
  // Snapshot of student profile at submission time
  studentCode?: string;
  fullName?: string;
  className?: string;
  gender?: 'male' | 'female' | 'other';
  answers: number[]; // Student's answers
  score: number;
  totalQuestions: number;
  timeSpent: number; // in minutes
  completedAt: Date;
  createdAt: Date;
}

const QuizResultSchema = new Schema<IQuizResult>({
  quizId: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Assignment',
    required: false
  },
  // Snapshot fields
  studentCode: { type: String, trim: true },
  fullName: { type: String, trim: true },
  className: { type: String, trim: true },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  answers: [{
    type: Number,
    required: true
  }],
  score: {
    type: Number,
    required: true,
    min: 0
  },
  totalQuestions: {
    type: Number,
    required: true,
    min: 1
  },
  timeSpent: {
    type: Number,
    required: true,
    min: 0
  },
  completedAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Index for better performance
QuizResultSchema.index({ quizId: 1, studentId: 1, assignmentId: 1 });
QuizResultSchema.index({ studentId: 1 });
QuizResultSchema.index({ completedAt: 1 });

export default mongoose.model<IQuizResult>('QuizResult', QuizResultSchema);
