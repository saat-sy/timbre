import { fetchAuthSession } from 'aws-amplify/auth';
import { API_CONFIG } from './config';
import type {
  UploadUrlRequest,
  UploadUrlResponse,
  SubmitJobRequest,
  SubmitJobResponse,
  JobStatusResponse,
  UserJobsResponse,
  ApiError,
} from './types';
import { ApiException } from './types';

class ApiClient {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new ApiException('AuthenticationError', 'No authentication token available', 401);
      }

      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    } catch (error) {
      if (error instanceof ApiException) {
        throw error;
      }
      console.error('Failed to get auth headers:', error);
      throw new ApiException('AuthenticationError', 'Authentication required', 401, error);
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const headers = await this.getAuthHeaders();

      const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        let errorData: ApiError;
        
        try {
          errorData = await response.json();
        } catch {
          // If we can't parse the error response, create a generic error
          errorData = {
            error: 'NetworkError',
            message: `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        throw ApiException.fromApiError(errorData, response.status);
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiException) {
        throw error;
      }
      
      // Handle network errors (fetch failures)
      throw ApiException.fromNetworkError(error);
    }
  }

  async createUploadUrl(request: UploadUrlRequest): Promise<UploadUrlResponse> {
    return this.makeRequest<UploadUrlResponse>(API_CONFIG.endpoints.createUploadUrl, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async uploadFile(uploadUrl: string, file: File): Promise<void> {
    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'x-amz-server-side-encryption': 'AES256',
        },
      });

      if (!response.ok) {
        throw ApiException.fromUploadError(response.status);
      }
    } catch (error) {
      if (error instanceof ApiException) {
        throw error;
      }
      
      // Handle network errors during upload
      throw ApiException.fromNetworkError(error);
    }
  }

  async submitJob(request: SubmitJobRequest): Promise<SubmitJobResponse> {
    return this.makeRequest<SubmitJobResponse>(API_CONFIG.endpoints.submitJob, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    return this.makeRequest<JobStatusResponse>(
      `${API_CONFIG.endpoints.getJobStatus}?job_id=${encodeURIComponent(jobId)}`
    );
  }

  async getUserJobs(params?: { limit?: number; status?: string }): Promise<UserJobsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `${API_CONFIG.endpoints.getUserJobs}?${queryString}`
      : API_CONFIG.endpoints.getUserJobs;

    return this.makeRequest<UserJobsResponse>(endpoint);
  }
}

export const apiClient = new ApiClient();