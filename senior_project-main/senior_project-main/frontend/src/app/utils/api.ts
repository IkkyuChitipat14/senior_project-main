const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8020';

export const api = {
  // Set user level based on location
  setUserLevel: async (location: 'campus' | 'hospital') => {
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('NEXT_PUBLIC_BACKEND_URL:',  process.env.NEXT_PUBLIC_BACKEND_URL);
    try {
      const response = await fetch(`${API_BASE_URL}/level/set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session
        body: JSON.stringify({ location }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error setting user level:', error);
      throw error;
    }
  },

  // Get current user level
  getUserLevel: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/level`, {
        method: 'GET',
        credentials: 'include', // Include cookies for session
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting user level:', error);
      throw error;
    }
  },

  // Check session
  checkSession: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/check-session`, {
        method: 'GET',
        credentials: 'include', // Include cookies for session
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking session:', error);
      throw error;
    }
  }
}; 