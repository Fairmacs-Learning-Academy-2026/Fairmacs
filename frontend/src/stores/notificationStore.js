import { create } from 'zustand';
import { MOCK_NOTIFICATIONS } from '../data/mockData';

export const useNotificationStore = create((set, get) => ({
  // State
  notifications: MOCK_NOTIFICATIONS,
  unreadCount: MOCK_NOTIFICATIONS.filter(n => !n.read).length,

  // Actions
  setNotifications: (notifications) => {
    set({ 
      notifications,
      unreadCount: notifications.filter(n => !n.read).length
    });
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    }));
  },

  markAsRead: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1)
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }));
  },

  deleteNotification: (notificationId) => {
    set((state) => {
      const updated = state.notifications.filter(n => n.id !== notificationId);
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.read).length
      };
    });
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  // Computed
  getUnreadNotifications: () => {
    return get().notifications.filter(n => !n.read);
  },

  getNotificationsByType: (type) => {
    return get().notifications.filter(n => n.type === type);
  }
}));
