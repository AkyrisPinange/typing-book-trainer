import { useEffect, useState, useCallback, useRef } from 'react';
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
  const loadingRef = useRef(false);

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
    if (!bookId || storeBookId === bookId || loadingRef.current) return;
    
    loadingRef.current = true;

    const loadBookData = async () => {
      const localProgress = getLocalProgress(bookId);
      
      // Try to load from MongoDB first
      let bookText: string | null = null;
      let bookTitle = 'Book';
      
      console.log('[DEBUG] Loading book:', { bookId, isAuthenticated });
      
      if (isAuthenticated) {
        try {
          console.log('[DEBUG] Attempting to fetch book from server...');
          const book = await getBook(bookId);
          console.log('[DEBUG] Book fetch result:', { 
            found: !!book, 
            hasText: !!book?.text, 
            textLength: book?.text?.length,
            title: book?.title 
          });
          if (book) {
            bookText = book.text;
            bookTitle = book.title;
            console.log('[DEBUG] Book loaded successfully from MongoDB');
          } else {
            console.log('[DEBUG] Book not found in MongoDB (returned null)');
          }
        } catch (error: any) {
          console.error('[DEBUG] Failed to load book from server:', error);
          // If it's a rate limit error, show a helpful message
          if (error?.message?.includes('Too many requests')) {
            console.warn('[DEBUG] Rate limited, will retry automatically or use sessionStorage fallback');
          }
        }
      } else {
        console.log('[DEBUG] Not authenticated, skipping MongoDB fetch');
      }
      
      // Fallback to sessionStorage if not found in MongoDB
      if (!bookText) {
        console.log('[DEBUG] Book text not found in MongoDB, checking sessionStorage...');
        const cachedText = sessionStorage.getItem(`book_text_${bookId}`);
        console.log('[DEBUG] SessionStorage result:', { found: !!cachedText, length: cachedText?.length });
        if (cachedText) {
          bookText = cachedText;
          console.log('[DEBUG] Book loaded from sessionStorage');
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

    loadBookData().finally(() => {
      loadingRef.current = false;
    });
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
  }, [storeBookId, text, title, positionIndex, stats, saveStoreProgress, isAuthenticated]);

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

    // Handle newlines: if followed by letter, treat as space; otherwise skip multiple newlines
    let currentIndex = positionIndex;
    console.log('[DEBUG] handleKeyDown - Start:', {
      positionIndex,
      currentChar: text[positionIndex],
      charCode: text[positionIndex]?.charCodeAt(0),
      nextChars: text.substring(positionIndex, positionIndex + 10).split('').map((c, i) => ({
        index: positionIndex + i,
        char: c === '\n' ? '\\n' : c === ' ' ? '[SPACE]' : c,
        charCode: c.charCodeAt(0)
      })),
      pressedKey: e.key
    });

    // Handle newlines: skip multiple consecutive newlines, but if followed by letter, treat as space
    while (currentIndex < text.length && text[currentIndex] === '\n') {
      // Find the next non-newline character
      let nextCharIndex = currentIndex + 1;
      while (nextCharIndex < text.length && text[nextCharIndex] === '\n') {
        nextCharIndex++;
      }
      
      if (nextCharIndex >= text.length) {
        // Only newlines remaining until end - skip them all
        console.log('[DEBUG] Only newlines remaining, skipping all');
        while (currentIndex < text.length && text[currentIndex] === '\n') {
          handleKeyPress('\n', '\n');
          currentIndex = useTypingStore.getState().positionIndex;
          if (currentIndex >= text.length) return;
        }
        break;
      }
      
      const nextChar = text[nextCharIndex];
      // If followed by letter, treat as space - don't skip, exit loop
      if (/[a-zA-Z]/.test(nextChar)) {
        console.log('[DEBUG] Newline at', currentIndex, 'followed by letter, treating as space');
        break; // Exit while loop, treat as space
      }
      
      // Not followed by letter - skip this newline and continue
      console.log('[DEBUG] Auto-advancing newline at index:', currentIndex, '(not followed by letter)');
      handleKeyPress('\n', '\n');
      currentIndex = useTypingStore.getState().positionIndex;
      if (currentIndex >= text.length) return;
      // Continue while loop to check next character
    }

    const expectedChar = text[currentIndex];
    console.log('[DEBUG] Expected char after newline handling:', {
      currentIndex,
      expectedChar: expectedChar === '\n' ? '\\n' : expectedChar === ' ' ? '[SPACE]' : expectedChar,
      charCode: expectedChar?.charCodeAt(0),
      pressedKey: e.key
    });

    // Special handling: if expectedChar is \n followed by letter, treat as space
    if (expectedChar === '\n' && currentIndex + 1 < text.length) {
      let nextCharIndex = currentIndex + 1;
      while (nextCharIndex < text.length && text[nextCharIndex] === '\n') {
        nextCharIndex++;
      }
      if (nextCharIndex < text.length && /[a-zA-Z]/.test(text[nextCharIndex])) {
        // Newline followed by letter - treat as space
        console.log('[DEBUG] Newline followed by letter, treating as space');
        if (e.key === ' ') {
          // User pressed space - mark newline as correct and advance
          handleKeyPress('\n', '\n');
          return;
        } else {
          // User pressed wrong key - mark as incorrect
          handleKeyPress(e.key, '\n');
          return;
        }
      }
    }

    const keyInfo = getKeyInfo(expectedChar, text, currentIndex);
    console.log('[DEBUG] KeyInfo:', keyInfo);

    // Process the key press
    const matchedKey = processKeyPress(e.key, expectedChar, keyInfo, e);
    console.log('[DEBUG] Matched key:', matchedKey);
    
    if (matchedKey === null) {
      // Wrong key
      console.log('[DEBUG] Key mismatch - marking as incorrect');
      handleKeyPress(e.key, expectedChar);
    } else {
      // Correct key
      console.log('[DEBUG] Key match - marking as correct');
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

