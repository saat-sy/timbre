import { signIn, signUp, signOut, getCurrentUser, fetchAuthSession, confirmSignUp, resendSignUpCode, fetchUserAttributes } from 'aws-amplify/auth';
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
      return new AuthError('Your account is not confirmed. Please verify your email address.', errorCode, error);

    case 'CodeMismatchException':
      return new AuthError('Invalid verification code. Please check and try again.', errorCode, error);

    case 'ExpiredCodeException':
      return new AuthError('Verification code has expired. Please request a new one.', errorCode, error);

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
 * Checks user confirmation status from user attributes
 * Now checks custom:status attribute for manual approval workflow
 */
export function checkUserConfirmationStatus(user: any, userAttributes: any): 'CONFIRMED' | 'UNCONFIRMED' | 'FORCE_CHANGE_PASSWORD' {
  if (!user) return 'UNCONFIRMED';

  if (user.challengeName === 'NEW_PASSWORD_REQUIRED') {
    return 'FORCE_CHANGE_PASSWORD';
  }

  const customStatus = userAttributes['custom:status'];

  if (customStatus === 'true') {
    return 'CONFIRMED';
  }

  return 'UNCONFIRMED';
}

/**
 * Transforms Amplify user object to our User interface
 */
async function transformAmplifyUser(amplifyUser: any): Promise<User> {
  // Fetch user attributes once and use for both confirmation status and user data
  let userAttributes = amplifyUser.attributes || {};
  try {
    const fetchedAttributes = await fetchUserAttributes();
    userAttributes = { ...userAttributes, ...fetchedAttributes };
  } catch (error) {
    // Fallback to user object attributes if fetch fails
  }

  // Check confirmation status using the fetched attributes
  const confirmationStatus = checkUserConfirmationStatus(amplifyUser, userAttributes);

  // Construct full name from given_name and family_name, or fallback to name attribute
  const firstName = userAttributes.given_name || '';
  const lastName = userAttributes.family_name || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') ||
    userAttributes.name ||
    userAttributes.email?.split('@')[0] || '';

  return {
    id: amplifyUser.userId || amplifyUser.username,
    email: userAttributes.email || amplifyUser.signInDetails?.loginId || '',
    name: fullName,
    createdAt: userAttributes.created_at
      ? new Date(userAttributes.created_at)
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
      return await transformAmplifyUser(currentUser);

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
        'custom:status': 'false',
      };

      const { userId } = await signUp({
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

      return await transformAmplifyUser(currentUser);

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

  /**
   * Confirms user email with verification code
   */
  confirmEmail: async (email: string, code: string): Promise<void> => {
    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });
    } catch (error: any) {
      console.error('Email confirmation error:', error);
      throw mapAmplifyError(error);
    }
  },

  /**
   * Resends email verification code
   */
  resendVerificationCode: async (email: string): Promise<void> => {
    try {
      await resendSignUpCode({
        username: email,
      });
    } catch (error: any) {
      console.error('Resend verification code error:', error);
      throw mapAmplifyError(error);
    }
  },
};