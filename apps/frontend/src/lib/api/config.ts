export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://your-api-gateway-url.amazonaws.com/prod',
  endpoints: {
    createUploadUrl: '/upload',
    submitJob: '/schedule_job',
    getJobStatus: '/get_job_status',
    getUserJobs: '/get_user_jobs',
  },
} as const;

export type ApiEndpoint = keyof typeof API_CONFIG.endpoints;