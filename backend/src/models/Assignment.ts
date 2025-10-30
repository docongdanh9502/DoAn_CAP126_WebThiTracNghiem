import mongoose, { Document, Schema } from 'mongoose';

export interface IAssignment extends Document {
  quizId: mongoose.Types.ObjectId;
  assignedTo: string[]; // Array of student emails
  assignedBy: mongoose.Types.ObjectId; // Teacher ID
  dueDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>({
  quizId: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  assignedTo: [{
    type: String,
    required: true
  }],
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better performance
AssignmentSchema.index({ assignedTo: 1 });
AssignmentSchema.index({ assignedBy: 1 });
AssignmentSchema.index({ dueDate: 1 });

export default mongoose.model<IAssignment>('Assignment', AssignmentSchema);
