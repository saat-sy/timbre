import { signIn, signUp, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { User, AuthError } from './types';

function mapAmplifyError(error: any): AuthError {
  const errorCode = error.name || error.code || 'UnknownError';
  const originalMessage = error.message || 'An unknown error occurred';

  switch (errorCode) {
    case 'UserNotFoundException':
      return new AuthError('No account found with this email address.', errorCode, error);

    case 'NotAuthorizedException':
      return new AuthError('Invalid email or password.', errorCode, error);

    case 'UserNotConfirmedException':
      return new AuthError('Your account is not confirmed. Please check your email for confirmation instructions.', errorCode, error);

    case 'UsernameExistsException':
      return new AuthError('An account with this email already exists.', errorCode, error);

    case 'InvalidPasswordException':
      return new AuthError('Password does not meet requirements.', errorCode, error);

    case 'InvalidParameterException':
      return new AuthError('Invalid email format or missing required fields.', errorCode, error);

    case 'TooManyRequestsException':
      return new AuthError('Too many requests. Please try again later.', errorCode, error);

    case 'NetworkError':
      return new AuthError('Network error. Please check your connection and try again.', errorCode, error);

    default:
      return new AuthError(
        `Authentication failed: ${originalMessage}`,
        errorCode,
        error
      );
  }
}

/**
 * Checks user confirmation status from Amplify user attributes
 */
export function checkUserConfirmationStatus(user: any): 'CONFIRMED' | 'UNCONFIRMED' | 'FORCE_CHANGE_PASSWORD' {
  if (!user) return 'UNCONFIRMED';

  if (user.challengeName === 'NEW_PASSWORD_REQUIRED') {
    return 'FORCE_CHANGE_PASSWORD';
  }

  const emailVerified = user.attributes?.email_verified;
  const userStatus = user.userStatus || user.attributes?.user_status;

  if (emailVerified === true || userStatus === 'CONFIRMED') {
    return 'CONFIRMED';
  }

  return 'UNCONFIRMED';
}

/**
 * Transforms Amplify user object to our User interface
 */
function transformAmplifyUser(amplifyUser: any): User {
  const confirmationStatus = checkUserConfirmationStatus(amplifyUser);

  return {
    id: amplifyUser.userId || amplifyUser.username,
    email: amplifyUser.attributes?.email || amplifyUser.signInDetails?.loginId || '',
    name: amplifyUser.attributes?.name || amplifyUser.attributes?.given_name,
    createdAt: amplifyUser.attributes?.created_at
      ? new Date(amplifyUser.attributes.created_at)
      : new Date(),
    confirmationStatus
  };
}

/**
 * AWS Amplify Authentication Service
 */
export const amplifyAuth = {
  /**
   * Authenticates user with email and password
   */
  login: async (email: string, password: string): Promise<User> => {
    try {
      const { isSignedIn } = await signIn({
        username: email,
        password: password,
      });

      if (!isSignedIn) {
        throw new Error('Sign in was not completed');
      }

      // Get the current user after successful sign in
      const currentUser = await getCurrentUser();
      return transformAmplifyUser(currentUser);

    } catch (error: any) {
      console.error('Login error:', error);
      throw mapAmplifyError(error);
    }
  },

  /**
   * Registers a new user with email and password
   */
  register: async (email: string, password: string): Promise<User> => {
    try {
      const { userId } = await signUp({
        username: email,
        password: password,
        options: {
          userAttributes: {
            email: email,
          },
        },
      });

      // Create user object for newly registered user
      // Note: New users will be UNCONFIRMED until manually confirmed
      const newUser: User = {
        id: userId || `user_${Date.now()}`,
        email: email,
        name: email.split('@')[0], // Use email prefix as default name
        createdAt: new Date(),
        confirmationStatus: 'UNCONFIRMED'
      };

      return newUser;

    } catch (error: any) {
      console.error('Registration error:', error);
      throw mapAmplifyError(error);
    }
  },

  /**
   * Signs out the current user
   */
  logout: async (): Promise<void> => {
    try {
      await signOut();
    } catch (error: any) {
      console.error('Logout error:', error);
      throw mapAmplifyError(error);
    }
  },

  /**
   * Gets the currently authenticated user
   */
  getCurrentUser: async (): Promise<User | null> => {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('getCurrentUser timeout')), 8000); // 8 second timeout
      });

      // Check if user is authenticated
      const session = await Promise.race([
        fetchAuthSession(),
        timeoutPromise
      ]);
      
      if (!session.tokens) {
        return null;
      }

      // Get current user details
      const currentUser = await Promise.race([
        getCurrentUser(),
        timeoutPromise
      ]);
      
      return transformAmplifyUser(currentUser);

    } catch (error: any) {
      if (error.name === 'UserUnAuthenticatedException' ||
        error.name === 'NotAuthorizedException' ||
        error.message === 'getCurrentUser timeout') {
        return null;
      }

      console.error('Get current user error:', error);
      throw mapAmplifyError(error);
    }
  },
};