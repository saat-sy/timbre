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
      return new AuthError(`Invalid parameters`, errorCode, error);

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
 * For manual confirmation workflow: email verification != user confirmation
 */
export function checkUserConfirmationStatus(user: any): 'CONFIRMED' | 'UNCONFIRMED' | 'FORCE_CHANGE_PASSWORD' {
  if (!user) return 'UNCONFIRMED';
  console.log('User confirmation status debug:', {
    challengeName: user.challengeName,
    emailVerified: user.attributes?.email_verified,
    userStatus: user.userStatus,
    attributesUserStatus: user.attributes?.user_status,
    allAttributes: user.attributes,
    fullUser: user
  });

  if (user.challengeName === 'NEW_PASSWORD_REQUIRED') {
    return 'FORCE_CHANGE_PASSWORD';
  }

  const userStatus = user.userStatus || user.attributes?.user_status;

  if (userStatus === 'CONFIRMED') {
    return 'CONFIRMED';
  }

  return 'UNCONFIRMED';
}

/**
 * Transforms Amplify user object to our User interface
 */
function transformAmplifyUser(amplifyUser: any): User {
  const confirmationStatus = checkUserConfirmationStatus(amplifyUser);

  // Construct full name from given_name and family_name, or fallback to name attribute
  const firstName = amplifyUser.attributes?.given_name || '';
  const lastName = amplifyUser.attributes?.family_name || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') ||
    amplifyUser.attributes?.name ||
    amplifyUser.attributes?.email?.split('@')[0] || '';

  return {
    id: amplifyUser.userId || amplifyUser.username,
    email: amplifyUser.attributes?.email || amplifyUser.signInDetails?.loginId || '',
    name: fullName,
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
   * Registers a new user with email, password, and optional first/last name
   */
  register: async (email: string, password: string, firstName?: string, lastName?: string): Promise<User> => {
    try {
      const userAttributes: Record<string, string> = {
        email: email,
        given_name: firstName?.trim() || 'User',
        family_name: lastName?.trim() || 'Name',
      };

      const { userId, nextStep } = await signUp({
        username: email,
        password: password,
        options: {
          userAttributes,
        },
      });

      const fullName = [firstName?.trim(), lastName?.trim()]
        .filter(Boolean)
        .join(' ') || email.split('@')[0];

      const newUser: User = {
        id: userId || `user_${Date.now()}`,
        email: email,
        name: fullName,
        createdAt: new Date(),
        confirmationStatus: 'UNCONFIRMED'
      };

      console.log('Sign up next step:', nextStep);

      return newUser;

    } catch (error: any) {
      console.error('Registration error:', error);
      console.error('Error details:', {
        name: error.name,
        code: error.code,
        message: error.message,
        email,
        passwordLength: password.length
      });
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