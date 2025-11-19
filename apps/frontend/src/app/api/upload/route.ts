import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { fileName, fileSize, fileType, prompt } = body;

        // Validate input
        if (!fileName || !fileSize || !fileType || !prompt) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Generate a dummy SESSION_ID
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Simulate API processing delay
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Return the session ID
        return NextResponse.json({
            sessionId,
            message: 'Upload successful',
            fileName,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Upload API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
