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

class ApiClient {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    } catch (error) {
      console.error('Failed to get auth headers:', error);
      throw new Error('Authentication required');
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'NetworkError',
        error_code: response.status,
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  async createUploadUrl(request: UploadUrlRequest): Promise<UploadUrlResponse> {
    return this.makeRequest<UploadUrlResponse>(API_CONFIG.endpoints.createUploadUrl, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async uploadFile(uploadUrl: string, file: File): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
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