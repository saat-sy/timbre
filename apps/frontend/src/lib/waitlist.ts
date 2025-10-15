export interface WaitlistEntry {
  id: string;
  email: string;
  additionalInfo?: string;
  createdAt: Date;
}

export interface WaitlistSubmissionData {
  email: string;
  additionalInfo?: string;
}

export interface WaitlistResponse {
  success: boolean;
  message: string;
  id?: string;
  error?: string;
}

/**
 * Submit an email to the waitlist
 */
export async function submitToWaitlist(data: WaitlistSubmissionData): Promise<WaitlistResponse> {
  try {
    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.error || "Failed to join waitlist",
        error: result.error,
      };
    }

    return {
      success: true,
      message: result.message || "Successfully joined the waitlist",
      id: result.id,
    };
  } catch (error) {
    return {
      success: false,
      message: "Network error. Please check your connection and try again.",
      error: "Network error",
    };
  }
}

/**
 * Get waitlist statistics
 */
export async function getWaitlistStats(): Promise<{ totalEntries: number; message: string }> {
  try {
    const response = await fetch("/api/waitlist");
    const result = await response.json();
    return result;
  } catch (error) {
    return {
      totalEntries: 0,
      message: "Unable to fetch waitlist statistics",
    };
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize and prepare waitlist data for submission
 */
export function prepareWaitlistData(rawData: {
  email: string;
  additionalInfo?: string;
}): WaitlistSubmissionData {
  return {
    email: rawData.email.trim().toLowerCase(),
    additionalInfo: rawData.additionalInfo?.trim() || undefined,
  };
}