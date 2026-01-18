import { create } from 'zustand';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('authToken'),
  isAuthenticated: !!localStorage.getItem('authToken'),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('authToken', token);
      set({ token, isAuthenticated: true });
    } else {
      localStorage.removeItem('authToken');
      set({ token: null, isAuthenticated: false });
    }
  },
  logout: () => {
    localStorage.removeItem('authToken');
    set({ token: null, isAuthenticated: false });
  },
}));

