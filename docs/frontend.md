# Frontend

The Timbre frontend is a Next.js application that provides the user interface for AI-powered video soundtrack generation.

### Tech Stack
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety and developer experience  
- **Tailwind CSS** - Utility-first styling
- **AWS Amplify** - Authentication and hosting
- **React 19** - Latest React features

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/               # Authentication pages (login, register, verify)
│   └── dashboard/          # Main application (job management, history)
├── components/             # React components
│   ├── dashboard/          # Dashboard-specific components
│   └── ui/                 # Shared UI components
├── lib/                    # Core application logic
│   ├── api/                # API client functions
│   ├── auth/               # Authentication logic
│   └── jobs/               # Job management utilities
└── styles/                 # Global styles
```

### Authentication Architecture

Uses **AWS Cognito** for user management with JWT-based authentication:

1. User registration/login via AWS Cognito
2. JWT token management with automatic refresh
3. Protected routes with auth guards
4. Secure API calls with bearer tokens

### Data Flow

1. **Authentication State** - Managed via React Context with Cognito integration
2. **API Communication** - RESTful calls to AWS API Gateway with JWT tokens
3. **Job Management** - Real-time status updates and progress tracking
4. **File Upload** - Direct S3 upload using presigned URLs