import { Amplify } from 'aws-amplify';

export interface AmplifyConfig {
  region: string;
  userPoolId: string;
  userPoolWebClientId: string;
}

function validateEnvironmentVariables(): AmplifyConfig {
  const region = process.env.NEXT_PUBLIC_AWS_REGION;
  const userPoolId = process.env.NEXT_PUBLIC_AWS_USER_POOL_ID;
  const userPoolWebClientId =
    process.env.NEXT_PUBLIC_AWS_USER_POOL_WEB_CLIENT_ID;

  const missingVars: string[] = [];

  if (!region) missingVars.push('NEXT_PUBLIC_AWS_REGION');
  if (!userPoolId) missingVars.push('NEXT_PUBLIC_AWS_USER_POOL_ID');
  if (!userPoolWebClientId)
    missingVars.push('NEXT_PUBLIC_AWS_USER_POOL_WEB_CLIENT_ID');

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
        'Please check your .env.local file and ensure all AWS Amplify configuration variables are set.'
    );
  }

  return {
    region: region!,
    userPoolId: userPoolId!,
    userPoolWebClientId: userPoolWebClientId!,
  };
}

export const amplifyConfig: AmplifyConfig = validateEnvironmentVariables();

export function configureAmplify(): void {
  try {
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: amplifyConfig.userPoolId,
          userPoolClientId: amplifyConfig.userPoolWebClientId,
        },
      },
    });

    console.log('AWS Amplify configured successfully');
  } catch (error) {
    console.error('Failed to configure AWS Amplify:', error);
    throw error;
  }
}

export function getAmplifyConfig(): AmplifyConfig {
  return amplifyConfig;
}
