import mongoose, { Schema, Document } from 'mongoose';

export interface IBook extends Document {
  bookId: string;
  title: string;
  author?: string;
  text: Buffer; // Compressed text
  totalChars: number;
  createdAt: Date;
  updatedAt: Date;
}

const BookSchema = new Schema<IBook>({
  bookId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  author: {
    type: String,
  },
  text: {
    type: Buffer,
    required: true,
  },
  totalChars: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IBook>('Book', BookSchema);

