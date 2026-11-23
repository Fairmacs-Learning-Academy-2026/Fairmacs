/**
 * Fairmacs KMS — Learning Streak & Activity Rings API Service
 * Handles employee consistency, dual activity rings, and weekly activity calendar.
 */

import {
  API_BASE_URL,
  getAuthHeaders,
  handleUnauthorized,
} from '../utils/apiConfig.js';

export const learningStreakService = {
  /**
   * Retrieves learning streaks, dual ring progress, and weekly activity
   * for the authenticated employee.
   *
   * @returns {Promise<Object>} LearningStreakDTO payload
   */
  getLearningStreaks: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/learning/streaks`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized(true);
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch learning streaks (${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching learning streaks:', error);
      throw error;
    }
  },
};
