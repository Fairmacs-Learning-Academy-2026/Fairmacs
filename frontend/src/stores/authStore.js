import { create } from 'zustand';
import { MOCK_USERS_DATABASE } from '../data/mockData';

export const useAuthStore = create((set, get) => ({
  // State
  user: null,
  isAuthenticated: false,
  isLoading: false,

  // Actions
  login: (email, password) => {
    set({ isLoading: true });
    // Simulate API call delay
    setTimeout(() => {
      const user = MOCK_USERS_DATABASE.find(u => u.email === email && u.password === password);
      if (user) {
        set({ user, isAuthenticated: true, isLoading: false });
        localStorage.setItem('fairmacs_user', JSON.stringify(user));
        return { success: true, user };
      } else {
        set({ isLoading: false });
        return { success: false, error: 'Invalid credentials' };
      }
    }, 500);
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
    localStorage.removeItem('fairmacs_user');
  },

  initializeAuth: () => {
    const storedUser = localStorage.getItem('fairmacs_user');
    if (storedUser) {
      set({ user: JSON.parse(storedUser), isAuthenticated: true });
    }
  },

  updateUser: (userData) => {
    set({ user: { ...get().user, ...userData } });
  }
}));
