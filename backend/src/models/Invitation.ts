import mongoose, { Document, Schema } from 'mongoose';

export interface IInvitation extends Document {
  quiz: mongoose.Types.ObjectId;
  email: string;
  studentName: string;
  studentId: string;
  token: string;
  isUsed: boolean;
  expiresAt: Date;
  createdAt: Date;
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