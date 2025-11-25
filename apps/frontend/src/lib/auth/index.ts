// Types
export type { User, AuthState } from './types';
export { AuthError } from './types';

// Validation
export {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  getPasswordValidationErrors,
} from './validation';

// Amplify Auth Service
export { amplifyAuth, checkUserConfirmationStatus } from './amplify-auth';

// Amplify Configuration
export { configureAmplify, getAmplifyConfig } from './amplify-config';
export type { AmplifyConfig } from './amplify-config';

// Context and Hooks
export { AuthProvider, useAuth } from './context';

// Middleware and HOCs
export {
  withAuth,
  withConfirmedAuth,
  useRedirectIfAuthenticated,
  useRedirectUnconfirmed,
} from './middleware';
