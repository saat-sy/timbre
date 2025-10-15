'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, AuthState, AuthError } from './types';
import { amplifyAuth } from './amplify-auth';

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGOUT' };

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isConfirmed: false,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isConfirmed: action.payload?.confirmationStatus === 'CONFIRMED',
        isLoading: false,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isConfirmed: action.payload.confirmationStatus === 'CONFIRMED',
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isConfirmed: false,
        isLoading: false,
      };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Auth check timeout')), 10000); // 10 second timeout
        });

        const user = await Promise.race([
          amplifyAuth.getCurrentUser(),
          timeoutPromise
        ]);
        
        dispatch({ type: 'SET_USER', payload: user });
      } catch (error) {
        console.error('Error checking existing auth:', error);
        dispatch({ type: 'SET_USER', payload: null });
      }
    };

    checkExistingAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const user = await amplifyAuth.login(email, password);
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      // Re-throw AuthError or wrap unknown errors
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Login failed. Please try again.');
    }
  };

  const register = async (email: string, password: string, confirmPassword: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const user = await amplifyAuth.register(email, password);
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Registration failed. Please try again.');
    }
  };

  const logout = async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await amplifyAuth.logout();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Logout failed. Please try again.');
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};