// Dummy authentication utilities for development/demo purposes
// Any email/password combination will result in successful authentication

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Dummy authentication functions that always succeed
export const dummyAuth = {
  // Login function - always succeeds with any email/password
  login: async (email: string, password: string): Promise<User> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user: User = {
      id: `user_${Date.now()}`,
      email,
      name: email.split('@')[0], // Use email prefix as name
      createdAt: new Date()
    };
    
    // Store in localStorage for session persistence
    localStorage.setItem('timbre_user', JSON.stringify(user));
    localStorage.setItem('timbre_auth_token', `dummy_token_${Date.now()}`);
    
    return user;
  },

  // Register function - always succeeds with any valid email
  register: async (email: string, password: string, confirmPassword: string): Promise<User> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const user: User = {
      id: `user_${Date.now()}`,
      email,
      name: email.split('@')[0],
      createdAt: new Date()
    };
    
    // Store in localStorage for session persistence
    localStorage.setItem('timbre_user', JSON.stringify(user));
    localStorage.setItem('timbre_auth_token', `dummy_token_${Date.now()}`);
    
    return user;
  },

  // Logout function
  logout: async (): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Clear localStorage
    localStorage.removeItem('timbre_user');
    localStorage.removeItem('timbre_auth_token');
  },

  // Check if user is authenticated from localStorage
  checkAuth: (): User | null => {
    if (typeof window === 'undefined') return null; // SSR safety
    
    const userStr = localStorage.getItem('timbre_user');
    const token = localStorage.getItem('timbre_auth_token');
    
    if (userStr && token) {
      try {
        const user = JSON.parse(userStr);
        // Convert createdAt back to Date object
        user.createdAt = new Date(user.createdAt);
        return user;
      } catch (error) {
        // Clear invalid data
        localStorage.removeItem('timbre_user');
        localStorage.removeItem('timbre_auth_token');
        return null;
      }
    }
    
    return null;
  }
};

// Form validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  // For demo purposes, any non-empty password is valid
  return password.length > 0;
};

export const validatePasswordMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword;
};