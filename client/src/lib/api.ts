// Ensure VITE_API_URL ends with /api or add it
const getApiBase = () => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  return url.endsWith('/api') ? url : `${url}/api`;
};
const API_BASE = getApiBase();

export interface ApiProgress {
  bookId: string;
  title: string;
  totalChars: number;
  positionIndex: number;
  stats: {
    totalTyped: number;
    totalErrors: number;
    accuracy: number;
    wpm: number;
    lastSessionAt: string;
  };
  updatedAt: string;
}

function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

export async function register(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  const data = await response.json();
  return data.accessToken;
}

export async function login(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const data = await response.json();
  return data.accessToken;
}

export async function getProgress(bookId: string): Promise<ApiProgress | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE}/progress/${bookId}`, {
      headers: getHeaders(),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error('Failed to fetch progress');
    }

    return await response.json();
  } catch {
    return null;
  }
}

export async function getAllProgress(): Promise<ApiProgress[]> {
  const token = getAuthToken();
  if (!token) return [];

  try {
    const response = await fetch(`${API_BASE}/progress`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      return [];
    }

    return await response.json();
  } catch {
    return [];
  }
}

export async function saveProgress(progress: ApiProgress): Promise<ApiProgress> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE}/progress/${progress.bookId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(progress),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save progress');
  }

  return await response.json();
}

export interface BookData {
  bookId: string;
  title: string;
  author?: string;
  text: string;
  totalChars: number;
}

export async function saveBook(book: BookData): Promise<{ bookId: string; title: string; author?: string; totalChars: number }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE}/book`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(book),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save book');
  }

  return await response.json();
}

export async function getBook(bookId: string, retryCount = 0): Promise<BookData | null> {
  const token = getAuthToken();
  console.log('[DEBUG] getBook called:', { bookId, hasToken: !!token, API_BASE, retryCount });
  
  if (!token) {
    console.log('[DEBUG] getBook: No auth token, returning null');
    return null;
  }

  try {
    const url = `${API_BASE}/book/${bookId}`;
    console.log('[DEBUG] getBook: Fetching from:', url);
    
    const response = await fetch(url, {
      headers: getHeaders(),
    });

    console.log('[DEBUG] getBook: Response status:', response.status);

    if (response.status === 404) {
      console.log('[DEBUG] getBook: Book not found (404)');
      return null;
    }

    // Handle rate limiting with retry
    if (response.status === 429) {
      if (retryCount < 3) {
        const retryAfter = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
        console.log(`[DEBUG] getBook: Rate limited (429), retrying after ${retryAfter}ms (attempt ${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        return getBook(bookId, retryCount + 1);
      } else {
        console.error('[DEBUG] getBook: Rate limited (429), max retries reached');
        throw new Error('Too many requests. Please wait a moment and try again.');
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DEBUG] getBook: Error response:', { status: response.status, error: errorText });
      throw new Error(`Failed to fetch book: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('[DEBUG] getBook: Success, book data:', { 
      bookId: data.bookId, 
      title: data.title, 
      hasText: !!data.text, 
      textLength: data.text?.length 
    });
    
    return data;
  } catch (error) {
    console.error('[DEBUG] getBook: Exception caught:', error);
    // Don't return null on rate limit errors, throw them so they can be handled
    if (error instanceof Error && error.message.includes('Too many requests')) {
      throw error;
    }
    return null;
  }
}

export async function checkBookExists(bookId: string): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE}/book/${bookId}/check`, {
      headers: getHeaders(),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function deleteBook(bookId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE}/book/${bookId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete book');
  }
}

