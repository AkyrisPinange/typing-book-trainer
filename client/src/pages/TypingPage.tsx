import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTypingStore } from '@/store/useTypingStore';
import { getLocalProgress, saveLocalProgress } from '@/lib/storage';
import { getProgress as getRemoteProgress, saveProgress as saveRemoteProgress, getBook } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { getKeyInfo, UPPER_CASE } from '@/lib/keyMapping';
import TextReader from '../components/Reader/TextReader';
import VirtualKeyboard from '../components/Keyboard/VirtualKeyboard';
import StatsPanel from '../components/Stats/StatsPanel';
import Button from '../components/ui/Button';
import { ArrowLeft, Save, Minus, Plus } from 'lucide-react';

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
  const [fontSize, setFontSize] = useState(1);

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

  // Helper function to process a key press for a given expected character
  const processKeyPress = (pressedKey: string, expectedChar: string, keyInfo: ReturnType<typeof getKeyInfo>, e: React.KeyboardEvent): string | null => {
    // Handle space
    if (expectedChar === ' ' && pressedKey === ' ') {
      return ' ';
    }
    
    // Handle uppercase letters and shift characters
    if (keyInfo.needsCapsLock || keyInfo.needsShift) {
      if (UPPER_CASE.test(expectedChar)) {
        const isCapsLockOn = e.getModifierState('CapsLock');
        const baseKeyMatches = pressedKey.toLowerCase() === keyInfo.key.toLowerCase();
        
        if (keyInfo.needsCapsLock) {
          if (isCapsLockOn && pressedKey === expectedChar) {
            return expectedChar;
          } else if (isCapsLockOn && baseKeyMatches) {
            return expectedChar;
          } else if (e.shiftKey && baseKeyMatches) {
            return expectedChar;
          }
        } else {
          if (e.shiftKey && baseKeyMatches) {
            return expectedChar;
          } else if (isCapsLockOn && (pressedKey === expectedChar || baseKeyMatches)) {
            return expectedChar;
          }
        }
      } else if (keyInfo.needsShift) {
        if (e.shiftKey && pressedKey.toLowerCase() === keyInfo.key.toLowerCase()) {
          return expectedChar;
        }
      }
    } else {
      // Regular characters
      if (/[a-z]/i.test(expectedChar) && pressedKey.toLowerCase() === expectedChar.toLowerCase()) {
        return expectedChar;
      } else if (pressedKey === expectedChar) {
        return expectedChar;
      }
    }
    
    return null; // Key doesn't match
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isFocused || !text || positionIndex >= text.length) return;

    // Ignore modifier keys when pressed alone (Shift, Control, Alt, Meta, CapsLock)
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' || e.key === 'CapsLock') {
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

    // Auto-advance on newlines: accept any key (except Backspace) to skip newline
    // But only advance newlines - spaces and other characters must be typed normally
    let currentIndex = positionIndex;
    while (currentIndex < text.length && text[currentIndex] === '\n') {
      // Mark newline as correct and advance automatically
      handleKeyPress('\n', '\n');
      // Get the updated position from store after advancing
      currentIndex = useTypingStore.getState().positionIndex;
      if (currentIndex >= text.length) return;
    }

    // After advancing newlines, get the actual character at the current position
    // This could be a space, letter, or any other character - it must be typed
    // Use the most up-to-date position from store to ensure synchronization
    const finalPositionIndex = useTypingStore.getState().positionIndex;
    const expectedChar = text[finalPositionIndex];
    
    // Get key info for the expected character (this will correctly handle spaces)
    const keyInfo = getKeyInfo(expectedChar, text, finalPositionIndex);

    // Process the key press for the expected character
    const matchedKey = processKeyPress(e.key, expectedChar, keyInfo, e);
    
    if (matchedKey === null) {
      // Wrong key
      handleKeyPress(e.key, expectedChar);
    } else {
      // Correct key
      handleKeyPress(matchedKey, expectedChar);
    }
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
            {/* Font size controls */}
            <div className="flex items-center justify-end gap-2 mb-2">
              <span className="text-xs text-muted-foreground">Font Size:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFontSize(Math.max(0.75, fontSize - 0.1))}
                className="h-7 w-7 p-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-12 text-center">{fontSize.toFixed(1)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFontSize(Math.min(2, fontSize + 0.1))}
                className="h-7 w-7 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="outline-none h-full"
            >
              <TextReader fontSize={fontSize} />
            </div>
            {!isFocused && (
              <div className="mt-1 text-center text-xs text-muted-foreground">
                Click on the text area to start typing
              </div>
            )}
          </div>

          {/* Virtual Keyboard at the bottom */}
          <div className="flex-shrink-0 mt-12">
            <VirtualKeyboard />
          </div>
        </div>
      </div>
    </div>
  );
}

