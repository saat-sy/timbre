import { NextRequest, NextResponse } from "next/server";

interface WaitlistEntry {
  id: string;
  email: string;
  additionalInfo?: string;
  createdAt: Date;
}

// In-memory storage for demo purposes
// In a real application, this would be stored in a database
let waitlistEntries: WaitlistEntry[] = [];

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isEmailAlreadyRegistered(email: string): boolean {
  return waitlistEntries.some(entry => 
    entry.email.toLowerCase() === email.toLowerCase()
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, additionalInfo } = body;

    // Validate required fields
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(email.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check for duplicate email
    if (isEmailAlreadyRegistered(trimmedEmail)) {
      return NextResponse.json(
        { error: "This email is already on the waitlist" },
        { status: 409 }
      );
    }

    // Create new waitlist entry
    const newEntry: WaitlistEntry = {
      id: generateId(),
      email: trimmedEmail,
      additionalInfo: additionalInfo?.trim() || undefined,
      createdAt: new Date(),
    };

    // Store the entry
    waitlistEntries.push(newEntry);

    // Log for development purposes
    console.log(`New waitlist entry: ${newEntry.email}`);
    console.log(`Total waitlist entries: ${waitlistEntries.length}`);

    return NextResponse.json(
      { 
        message: "Successfully joined the waitlist",
        id: newEntry.id 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Waitlist API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Optional: Return waitlist statistics and entries (for admin purposes)
  const { searchParams } = new URL(request.url);
  const includeEntries = searchParams.get('includeEntries') === 'true';
  
  const response: any = {
    totalEntries: waitlistEntries.length,
    message: "Waitlist API is running"
  };
  
  if (includeEntries) {
    // In a real app, this would require admin authentication
    response.entries = waitlistEntries.map(entry => ({
      id: entry.id,
      email: entry.email,
      additionalInfo: entry.additionalInfo,
      createdAt: entry.createdAt
    }));
  }
  
  return NextResponse.json(response);
}