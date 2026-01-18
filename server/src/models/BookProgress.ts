import mongoose, { Schema, Document } from 'mongoose';

export interface IBookProgress extends Document {
  userId: mongoose.Types.ObjectId;
  bookId: string;
  title: string;
  totalChars: number;
  positionIndex: number;
  stats: {
    totalTyped: number;
    totalErrors: number;
    accuracy: number;
    wpm: number;
    lastSessionAt: Date;
  };
  updatedAt: Date;
}

const BookProgressSchema = new Schema<IBookProgress>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  bookId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  totalChars: {
    type: Number,
    required: true,
  },
  positionIndex: {
    type: Number,
    required: true,
    min: 0,
  },
  stats: {
    totalTyped: { type: Number, default: 0 },
    totalErrors: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    wpm: { type: Number, default: 0 },
    lastSessionAt: { type: Date, default: Date.now },
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient queries
BookProgressSchema.index({ userId: 1, bookId: 1 }, { unique: true });

export default mongoose.model<IBookProgress>('BookProgress', BookProgressSchema);

