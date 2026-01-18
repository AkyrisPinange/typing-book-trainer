import { create } from 'zustand';
import { LocalProgress, saveLocalProgress, getLocalProgress } from '../lib/storage';
import { calculateWPM, calculateAccuracy } from '../lib/wpm';

export interface TypingState {
  bookId: string | null;
  title: string;
  text: string;
  positionIndex: number;
  typedChars: Map<number, 'correct' | 'incorrect'>;
  sessionStartTime: number | null;
  stats: {
    totalTyped: number;
    totalErrors: number;
    accuracy: number;
    wpm: number;
    lastSessionAt: string;
  };
  isTyping: boolean;
}

interface TypingActions {
  loadBook: (bookId: string, title: string, text: string, progress?: LocalProgress) => void;
  handleKeyPress: (key: string, expectedChar: string) => void;
  handleBackspace: () => void;
  startSession: () => void;
  endSession: () => void;
  reset: () => void;
  saveProgress: () => void;
}

export const useTypingStore = create<TypingState & TypingActions>((set, get) => ({
  bookId: null,
  title: '',
  text: '',
  positionIndex: 0,
  typedChars: new Map(),
  sessionStartTime: null,
  stats: {
    totalTyped: 0,
    totalErrors: 0,
    accuracy: 100,
    wpm: 0,
    lastSessionAt: new Date().toISOString(),
  },
  isTyping: false,

  loadBook: (bookId, title, text, progress) => {
    const positionIndex = progress?.positionIndex || 0;
    const stats = progress?.stats || {
      totalTyped: 0,
      totalErrors: 0,
      accuracy: 100,
      wpm: 0,
      lastSessionAt: new Date().toISOString(),
    };

    set({
      bookId,
      title,
      text,
      positionIndex,
      typedChars: new Map(),
      stats,
      isTyping: false,
      sessionStartTime: null,
    });
  },

  handleKeyPress: (key, expectedChar) => {
    const state = get();
    if (!state.bookId || state.positionIndex >= state.text.length) return;

    const isCorrect = key === expectedChar;
    const newTypedChars = new Map(state.typedChars);
    newTypedChars.set(state.positionIndex, isCorrect ? 'correct' : 'incorrect');

    const newPositionIndex = state.positionIndex + 1;
    const newTotalTyped = state.stats.totalTyped + 1;
    const newTotalErrors = state.stats.totalErrors + (isCorrect ? 0 : 1);

    const timeElapsed = state.sessionStartTime
      ? (Date.now() - state.sessionStartTime) / 1000
      : 0;
    const newWpm = calculateWPM(newTotalTyped, timeElapsed);
    const newAccuracy = calculateAccuracy(newTotalTyped - newTotalErrors, newTotalTyped);

    set({
      positionIndex: newPositionIndex,
      typedChars: newTypedChars,
      stats: {
        totalTyped: newTotalTyped,
        totalErrors: newTotalErrors,
        accuracy: newAccuracy,
        wpm: newWpm,
        lastSessionAt: new Date().toISOString(),
      },
      isTyping: true,
    });
  },

  handleBackspace: () => {
    const state = get();
    if (state.positionIndex === 0) return;

    const newPositionIndex = state.positionIndex - 1;
    const newTypedChars = new Map(state.typedChars);
    const wasCorrect = newTypedChars.get(newPositionIndex) === 'correct';
    newTypedChars.delete(newPositionIndex);

    const newTotalTyped = Math.max(0, state.stats.totalTyped - 1);
    const newTotalErrors = Math.max(0, state.stats.totalErrors - (wasCorrect ? 0 : 1));

    const timeElapsed = state.sessionStartTime
      ? (Date.now() - state.sessionStartTime) / 1000
      : 0;
    const newWpm = calculateWPM(newTotalTyped, timeElapsed);
    const newAccuracy = calculateAccuracy(newTotalTyped - newTotalErrors, newTotalTyped);

    set({
      positionIndex: newPositionIndex,
      typedChars: newTypedChars,
      stats: {
        ...state.stats,
        totalTyped: newTotalTyped,
        totalErrors: newTotalErrors,
        accuracy: newAccuracy,
        wpm: newWpm,
      },
    });
  },

  startSession: () => {
    set({ sessionStartTime: Date.now(), isTyping: true });
  },

  endSession: () => {
    set({ isTyping: false });
  },

  reset: () => {
    set({
      positionIndex: 0,
      typedChars: new Map(),
      sessionStartTime: null,
      stats: {
        totalTyped: 0,
        totalErrors: 0,
        accuracy: 100,
        wpm: 0,
        lastSessionAt: new Date().toISOString(),
      },
      isTyping: false,
    });
  },

  saveProgress: () => {
    const state = get();
    if (!state.bookId) return;

    const progress: LocalProgress = {
      bookId: state.bookId,
      title: state.title,
      totalChars: state.text.length,
      positionIndex: state.positionIndex,
      updatedAt: new Date().toISOString(),
      stats: state.stats,
    };

    saveLocalProgress(progress);
  },
}));

