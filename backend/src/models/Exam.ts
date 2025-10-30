import mongoose, { Document, Schema } from 'mongoose';

export interface IExam extends Document {
  quiz: mongoose.Types.ObjectId;
  invitation: mongoose.Types.ObjectId;
  studentInfo: {
    name: string;
    studentId: string;
    email: string;
  };
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'expired';
  answers: {
    questionId: mongoose.Types.ObjectId;
    answer: any;
    isCorrect: boolean;
    points: number;
  }[];
  totalScore: number;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
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