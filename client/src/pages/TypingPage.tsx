import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTypingStore } from '@/store/useTypingStore';
import { getLocalProgress, saveLocalProgress } from '@/lib/storage';
import { getProgress as getRemoteProgress, saveProgress as saveRemoteProgress, getBook } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { getKeyInfo } from '@/lib/keyMapping';
import TextReader from '../components/Reader/TextReader';
import VirtualKeyboard from '../components/Keyboard/VirtualKeyboard';
import StatsPanel from '../components/Stats/StatsPanel';
import Button from '../components/ui/Button';
import { ArrowLeft, Save } from 'lucide-react';

export default function TypingPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const {
    bookId: storeBookId,
    title,
    text,
    positionIndex,
    loadBook,
    handleKeyPress,
    handleBackspace,
    startSession,
    endSession,
    saveProgress: saveStoreProgress,
    stats,
  } = useTypingStore();

  const [isFocused, setIsFocused] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const syncWithRemote = async (bookId: string) => {
    try {
      const remote = await getRemoteProgress(bookId);
      if (remote && text) {
        const local = getLocalProgress(bookId);
        const remoteDate = new Date(remote.updatedAt);
        const localDate = local ? new Date(local.updatedAt) : new Date(0);
        
        // Use remote if newer or same date but larger position
        if (remoteDate > localDate || (remoteDate.getTime() === localDate.getTime() && remote.positionIndex > (local?.positionIndex || 0))) {
          // Reload book with remote progress
          loadBook(bookId, remote.title, text, {
            bookId: remote.bookId,
            title: remote.title,
            totalChars: remote.totalChars,
            positionIndex: remote.positionIndex,
            updatedAt: remote.updatedAt,
            stats: remote.stats,
          });
        }
      }
    } catch (error) {
      console.error('Failed to sync with remote:', error);
    }
  };

  // Load book data on mount
  useEffect(() => {
    if (!bookId || storeBookId === bookId) return;

    const loadBookData = async () => {
      const localProgress = getLocalProgress(bookId);
      
      // Try to load from MongoDB first
      let bookText: string | null = null;
      let bookTitle = 'Book';
      
      if (isAuthenticated) {
        try {
          const book = await getBook(bookId);
          if (book) {
            bookText = book.text;
            bookTitle = book.title;
          }
        } catch (error) {
          console.error('Failed to load book from server:', error);
        }
      }
      
      // Fallback to sessionStorage if not found in MongoDB
      if (!bookText) {
        const cachedText = sessionStorage.getItem(`book_text_${bookId}`);
        if (cachedText) {
          bookText = cachedText;
        }
      }
      
      if (bookText) {
        const progress = localProgress || undefined;
        const finalTitle = progress?.title || bookTitle;
        loadBook(bookId, finalTitle, bookText, progress);
        
        // Sync with remote if authenticated
        if (isAuthenticated) {
          await syncWithRemote(bookId);
        }
      } else {
        // If no text found, check if book exists in local storage
        const { getAllBookInfo } = await import('@/lib/storage');
        const books = getAllBookInfo();
        const book = books.find(b => b.bookId === bookId);
        
        if (book) {
          // Book exists but text is not available - prompt user to re-import
          alert(`Book "${book.title}" found but text is not available. Please re-import the book to continue.`);
        }
        navigate('/');
      }
    };

    loadBookData();
  }, [bookId, storeBookId, loadBook, isAuthenticated, navigate]);

  // Auto-save progress
  const debouncedSave = useCallback(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    const timer = setTimeout(() => {
      if (storeBookId && text) {
        saveStoreProgress();
        
        const progress = {
          bookId: storeBookId,
          title,
          totalChars: text.length,
          positionIndex,
          updatedAt: new Date().toISOString(),
          stats,
        };

        saveLocalProgress(progress);

        if (isAuthenticated) {
          saveRemoteProgress(progress).catch(console.error);
        }
      }
    }, 5000); // 5 second debounce

    setAutoSaveTimer(timer);
  }, [autoSaveTimer, storeBookId, text, title, positionIndex, stats, saveStoreProgress, isAuthenticated]);

  useEffect(() => {
    if (isFocused && positionIndex > 0) {
      debouncedSave();
    }
  }, [positionIndex, isFocused, debouncedSave]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      if (storeBookId && text) {
        saveStoreProgress();
        const progress = {
          bookId: storeBookId,
          title,
          totalChars: text.length,
          positionIndex,
          updatedAt: new Date().toISOString(),
          stats,
        };
        saveLocalProgress(progress);
        if (isAuthenticated) {
          saveRemoteProgress(progress).catch(console.error);
        }
      }
      endSession();
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isFocused || !text || positionIndex >= text.length) return;

    // Ignore modifier keys when pressed alone (Shift, Control, Alt, Meta)
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
      return;
    }

    // Ignore control keys
    if (e.ctrlKey || e.metaKey || e.altKey) {
      if (e.key === 'Backspace') {
        // Allow Ctrl+Backspace or Cmd+Backspace
      } else {
        return;
      }
    }

    e.preventDefault();

    if (e.key === 'Backspace') {
      handleBackspace();
      return;
    }

    const expectedChar = text[positionIndex];
    const keyInfo = getKeyInfo(expectedChar);

    // Map the pressed key to what we expect
    let pressedKey = e.key;

    // Handle special cases
    if (expectedChar === '\n' && e.key === 'Enter') {
      pressedKey = '\n';
    } else if (expectedChar === ' ' && e.key === ' ') {
      pressedKey = ' ';
    } else if (keyInfo.needsShift) {
      // For shift characters, check if shift was pressed and the base key matches
      if (e.shiftKey && pressedKey.toLowerCase() === keyInfo.key.toLowerCase()) {
        pressedKey = expectedChar;
      } else {
        // Wrong key
        handleKeyPress(pressedKey, expectedChar);
        return;
      }
    } else {
      // For regular characters, compare case-insensitively for letters
      if (/[a-z]/i.test(expectedChar) && pressedKey.toLowerCase() === expectedChar.toLowerCase()) {
        pressedKey = expectedChar;
      } else if (pressedKey !== expectedChar) {
        // Wrong key
        handleKeyPress(pressedKey, expectedChar);
        return;
      }
    }

    handleKeyPress(pressedKey, expectedChar);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (!text || positionIndex >= text.length) return;
    startSession();
  };

  const handleBlur = () => {
    setIsFocused(false);
    endSession();
  };

  if (!text) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Loading book...</p>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="container mx-auto px-4 py-2 flex-1 flex flex-col min-h-0">
        {/* Topbar */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-bold">{title}</h1>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              saveStoreProgress();
              const progress = {
                bookId: storeBookId!,
                title,
                totalChars: text.length,
                positionIndex,
                updatedAt: new Date().toISOString(),
                stats,
              };
              saveLocalProgress(progress);
              if (isAuthenticated) {
                saveRemoteProgress(progress).catch(console.error);
              }
            }}
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          {/* Statistics at the top */}
          <StatsPanel />

          {/* Text Reader in the middle - reduced height */}
          <div className="h-[200px] flex-shrink-0">
            <div
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="outline-none h-full"
            >
              <TextReader />
            </div>
            {!isFocused && (
              <div className="mt-1 text-center text-xs text-muted-foreground">
                Click on the text area to start typing
              </div>
            )}
          </div>

          {/* Virtual Keyboard at the bottom */}
          <div className="flex-shrink-0">
            <VirtualKeyboard />
          </div>
        </div>
      </div>
    </div>
  );
}

