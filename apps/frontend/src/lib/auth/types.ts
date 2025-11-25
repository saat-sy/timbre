export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  confirmationStatus: 'CONFIRMED' | 'UNCONFIRMED' | 'FORCE_CHANGE_PASSWORD';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isConfirmed: boolean;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
