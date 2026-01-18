export interface LocalProgress {
  bookId: string;
  title?: string;
  totalChars: number;
  positionIndex: number;
  updatedAt: string;
  stats: {
    totalTyped: number;
    totalErrors: number;
    accuracy: number;
    wpm: number;
    lastSessionAt: string;
  };
}

const STORAGE_KEY = 'typing-trainer-progress';
const BOOKS_KEY = 'typing-trainer-books';

export function saveLocalProgress(progress: LocalProgress): void {
  const allProgress = getAllLocalProgress();
  const existingIndex = allProgress.findIndex(p => p.bookId === progress.bookId);
  
  if (existingIndex >= 0) {
    allProgress[existingIndex] = progress;
  } else {
    allProgress.push(progress);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allProgress));
}

export function getLocalProgress(bookId: string): LocalProgress | null {
  const allProgress = getAllLocalProgress();
  return allProgress.find(p => p.bookId === bookId) || null;
}

export function getAllLocalProgress(): LocalProgress[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveBookInfo(bookId: string, title: string, totalChars: number): void {
  const books = getAllBookInfo();
  const existing = books.find(b => b.bookId === bookId);
  
  if (existing) {
    existing.title = title;
    existing.totalChars = totalChars;
  } else {
    books.push({ bookId, title, totalChars });
  }
  
  localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
}

export function getAllBookInfo(): Array<{ bookId: string; title: string; totalChars: number }> {
  try {
    const data = localStorage.getItem(BOOKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function deleteBookInfo(bookId: string): void {
  const books = getAllBookInfo();
  const filtered = books.filter(b => b.bookId !== bookId);
  localStorage.setItem(BOOKS_KEY, JSON.stringify(filtered));
}

export function deleteLocalProgress(bookId: string): void {
  const allProgress = getAllLocalProgress();
  const filtered = allProgress.filter(p => p.bookId !== bookId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

