import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cleanGutenbergText, generateBookId } from '@/lib/gutenbergCleaner';
import { saveBookInfo, getAllBookInfo, getAllLocalProgress, deleteBookInfo, deleteLocalProgress } from '@/lib/storage';
import { getAllProgress as getRemoteProgress, saveProgress, saveBook, getBook, deleteBook as deleteRemoteBook } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useTypingStore } from '@/store/useTypingStore';
import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Moon, Sun, LogOut, Upload, Trash2 } from 'lucide-react';

export default function Home() {
  const [books, setBooks] = useState<Array<{
    bookId: string;
    title: string;
    totalChars: number;
    progress: number;
    synced: boolean;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();
  const { loadBook } = useTypingStore();

  useEffect(() => {
    loadBooks();
  }, [isAuthenticated]);

  const loadBooks = async () => {
    const localBooks = getAllBookInfo();
    const localProgress = getAllLocalProgress();
    const remoteProgress = isAuthenticated ? await getRemoteProgress() : [];

    const booksWithProgress = localBooks.map((book) => {
      const local = localProgress.find((p) => p.bookId === book.bookId);
      const remote = remoteProgress.find((p) => p.bookId === book.bookId);

      // Use remote if available and newer, otherwise use local
      let progress = local?.positionIndex || 0;
      if (remote) {
        const remoteDate = new Date(remote.updatedAt);
        const localDate = local ? new Date(local.updatedAt) : new Date(0);
        if (remoteDate >= localDate) {
          progress = remote.positionIndex;
        }
      }

      return {
        bookId: book.bookId,
        title: book.title,
        totalChars: book.totalChars,
        progress: (progress / book.totalChars) * 100,
        synced: !!remote,
      };
    });

    setBooks(booksWithProgress);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Require authentication
    if (!isAuthenticated) {
      alert('Please login to import books');
      navigate('/login');
      return;
    }

    setLoading(true);

    try {
      const text = await file.text();
      const cleaned = cleanGutenbergText(text);
      const bookId = await generateBookId(cleaned.text, cleaned.title);
      const title = cleaned.title || file.name.replace('.txt', '');

      saveBookInfo(bookId, title, cleaned.text.length);

      // Save book to MongoDB
      try {
        await saveBook({
          bookId,
          title,
          author: cleaned.author,
          text: cleaned.text,
          totalChars: cleaned.text.length,
        });
      } catch (error) {
        console.error('Failed to save book to server:', error);
        // Continue anyway, will try to save later
      }

      // Try to load existing progress
      const { getLocalProgress } = await import('@/lib/storage');
      const existingProgress = getLocalProgress(bookId);
      
      // Load book and navigate
      loadBook(bookId, title, cleaned.text, existingProgress || undefined);
      navigate(`/typing/${bookId}`);
    } catch (error) {
      console.error('Failed to process file:', error);
      alert('Failed to process file. Please ensure it is a valid text file.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleContinue = async (bookId: string) => {
    navigate(`/typing/${bookId}`);
  };

  const handleDeleteBook = async (bookId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete from MongoDB if authenticated
      if (isAuthenticated) {
        try {
          await deleteRemoteBook(bookId);
        } catch (error) {
          console.error('Failed to delete book from server:', error);
          // Continue to delete locally anyway
        }
      }

      // Delete from local storage
      deleteBookInfo(bookId);
      deleteLocalProgress(bookId);
      sessionStorage.removeItem(`book_text_${bookId}`);

      // Reload books list
      loadBooks();
    } catch (error) {
      console.error('Failed to delete book:', error);
      alert('Failed to delete book. Please try again.');
    }
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    root.classList.toggle('dark');
    localStorage.setItem('theme', root.classList.contains('dark') ? 'dark' : 'light');
  };

  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Typing Book Trainer</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              <Sun className="h-5 w-5 dark:hidden" />
              <Moon className="h-5 w-5 hidden dark:block" />
            </Button>
            {isAuthenticated ? (
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                  Login
                </Button>
                <Button size="sm" onClick={() => navigate('/register')}>
                  Register
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import Book</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="hidden"
                disabled={!isAuthenticated}
              />
              <Button
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/login');
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                disabled={loading || !isAuthenticated}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {loading ? 'Processing...' : 'Upload .txt File'}
              </Button>
              {!isAuthenticated ? (
                <p className="text-sm text-destructive mt-2">
                  Please login to import books
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  Upload a Project Gutenberg .txt file to start practicing
                </p>
              )}
            </CardContent>
          </Card>

          {books.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Books</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {books.map((book) => (
                    <div
                      key={book.bookId}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{book.title}</h3>
                          {book.synced && isAuthenticated && (
                            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                              Synced
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {book.progress.toFixed(1)}% complete
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all"
                            style={{ width: `${book.progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleContinue(book.bookId)}
                        >
                          Continue
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBook(book.bookId, book.title)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

