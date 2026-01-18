import { Response } from 'express';
import BookProgress from '../models/BookProgress.js';
import { progressSchema } from '../utils/validation.js';
import { AuthRequest } from '../middleware/auth.js';

export const getProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { bookId } = req.params;
    const userId = req.userId!;

    const progress = await BookProgress.findOne({ userId, bookId });
    if (!progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }

    res.json({
      bookId: progress.bookId,
      title: progress.title,
      totalChars: progress.totalChars,
      positionIndex: progress.positionIndex,
      stats: progress.stats,
      updatedAt: progress.updatedAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
};

export const getAllProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const progressList = await BookProgress.find({ userId })
      .sort({ updatedAt: -1 })
      .select('bookId title totalChars positionIndex stats updatedAt');

    res.json(progressList.map(p => ({
      bookId: p.bookId,
      title: p.title,
      totalChars: p.totalChars,
      positionIndex: p.positionIndex,
      stats: p.stats,
      updatedAt: p.updatedAt.toISOString(),
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch progress list' });
  }
};

export const saveProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { bookId } = req.params;
    const userId = req.userId!;
    const data = progressSchema.parse(req.body);

    const progress = await BookProgress.findOneAndUpdate(
      { userId, bookId },
      {
        userId,
        bookId,
        title: data.title,
        totalChars: data.totalChars,
        positionIndex: data.positionIndex,
        stats: {
          totalTyped: data.stats.totalTyped,
          totalErrors: data.stats.totalErrors,
          accuracy: data.stats.accuracy,
          wpm: data.stats.wpm,
          lastSessionAt: new Date(data.stats.lastSessionAt),
        },
        updatedAt: new Date(data.updatedAt),
      },
      { upsert: true, new: true }
    );

    res.json({
      bookId: progress.bookId,
      title: progress.title,
      totalChars: progress.totalChars,
      positionIndex: progress.positionIndex,
      stats: progress.stats,
      updatedAt: progress.updatedAt.toISOString(),
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: 'Failed to save progress' });
  }
};

