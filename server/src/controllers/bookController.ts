import { Response } from 'express';
import { z } from 'zod';
import Book from '../models/Book.js';
import { AuthRequest } from '../middleware/auth.js';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

const bookSchema = z.object({
  bookId: z.string().min(1),
  title: z.string().min(1),
  author: z.string().optional(),
  text: z.string().min(1),
  totalChars: z.number().int().positive(),
});

export const saveBook = async (req: AuthRequest, res: Response) => {
  try {
    const data = bookSchema.parse(req.body);

    // Compress text
    const compressedText = await gzipAsync(Buffer.from(data.text, 'utf-8'));

    const book = await Book.findOneAndUpdate(
      { bookId: data.bookId },
      {
        bookId: data.bookId,
        title: data.title,
        author: data.author,
        text: compressedText,
        totalChars: data.totalChars,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({
      bookId: book.bookId,
      title: book.title,
      author: book.author,
      totalChars: book.totalChars,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to save book' });
  }
};

export const getBook = async (req: AuthRequest, res: Response) => {
  try {
    const { bookId } = req.params;

    const book = await Book.findOne({ bookId });
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Decompress text
    const decompressedText = (await gunzipAsync(book.text)).toString('utf-8');

    res.json({
      bookId: book.bookId,
      title: book.title,
      author: book.author,
      text: decompressedText,
      totalChars: book.totalChars,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch book' });
  }
};

export const checkBookExists = async (req: AuthRequest, res: Response) => {
  try {
    const { bookId } = req.params;

    const book = await Book.findOne({ bookId }).select('bookId title author totalChars');
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json({
      bookId: book.bookId,
      title: book.title,
      author: book.author,
      totalChars: book.totalChars,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check book' });
  }
};

export const deleteBook = async (req: AuthRequest, res: Response) => {
  try {
    const { bookId } = req.params;

    const book = await Book.findOneAndDelete({ bookId });
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete book' });
  }
};

