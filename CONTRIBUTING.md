# Contributing to Timbre

Thank you for your interest in contributing to Timbre! 🎵 We're excited to have you join our community of developers working on real-time AI music generation for videos.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (>=18)
- **Python** (3.8+)
- **pnpm** (9.0.0+)
- **Docker** and **Docker Compose**
- **Git**

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR-USERNAME/timbre.git
   cd timbre
   ```

2. **Install dependencies**
   ```bash
   # Install all dependencies (frontend + backend)
   pnpm install:deps
   
   # Install Python dependencies for backend
   pnpm install:python
   ```

3. **Set up environment variables**
   ```bash
   # Copy environment files and configure
   cp apps/backend/.env.example apps/backend/.env
   cp apps/frontend/.env.example apps/frontend/.env.local
   ```

4. **Start development services**
   ```bash
   # Start Redis and other services
   docker-compose up -d
   
   # Start development servers
   pnpm dev
   ```

5. **Verify setup**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Project Structure

Timbre is a monorepo with the following structure:

```
timbre/
├── apps/
│   ├── frontend/          # Next.js 14 frontend application
│   └── backend/           # FastAPI backend service
├── packages/              # Shared packages and configurations
├── assets/               # Project assets and documentation images
└── docker-compose.yml    # Development environment setup
```

### Key Components

- **Frontend** (`apps/frontend/`): Next.js React application with TypeScript
- **Backend** (`apps/backend/`): FastAPI Python service with real-time WebSocket support
- **Shared Packages** (`packages/`): ESLint configs, TypeScript configs, and shared utilities

## Contributing Guidelines

### Types of Contributions

We welcome various types of contributions:

- 🐛 **Bug fixes**
- ✨ **New features**
- 📚 **Documentation improvements**
- 🧪 **Tests**
- 🎨 **UI/UX improvements**
- ⚡ **Performance optimizations**
- 🔧 **Tooling and infrastructure**

### Before You Start

1. **Check existing issues** - Look for existing issues or discussions
2. **Create an issue** - For new features or significant changes, create an issue first
3. **Get feedback** - Discuss your approach with maintainers
4. **Small PRs** - Keep pull requests focused and reasonably sized

### Branch Naming

Use descriptive branch names with prefixes:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests

Examples:
- `feature/audio-visualization`
- `fix/websocket-connection-timeout`
- `docs/api-documentation-update`

## Pull Request Process

### 1. Prepare Your Changes

```bash
# Create a new branch
git checkout -b feature/your-feature-name

# Make your changes
# ...

# Run tests and linting
pnpm test
pnpm lint

# Format code
pnpm format
```

### 2. Commit Guidelines

Use conventional commit messages:

```
type(scope): description

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**
```
feat(backend): add real-time audio streaming support
fix(frontend): resolve video upload timeout issue
docs(api): update WebSocket endpoint documentation
```

### 3. Submit Pull Request

1. **Push your branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create PR** - Open a pull request with:
   - Clear title and description
   - Reference related issues
   - Screenshots/demos for UI changes
   - Breaking change notes (if applicable)

3. **Review process**
   - Automated checks must pass
   - Code review by maintainers
   - Address feedback promptly

## Coding Standards

### TypeScript/JavaScript (Frontend)

- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting
- Prefer functional components with hooks
- Use proper TypeScript types (avoid `any`)

### Python (Backend)

- Follow PEP 8 style guidelines
- Use type hints for function signatures
- Write docstrings for public functions/classes
- Use async/await for I/O operations
- Follow FastAPI best practices

### General Guidelines

- Write self-documenting code
- Add comments for complex logic
- Keep functions small and focused
- Use meaningful variable names
- Handle errors gracefully

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:cov

# Frontend tests only
cd apps/frontend && npm test

# Backend tests only
cd apps/backend && python -m pytest
```

### Writing Tests

- **Frontend**: Use Jest and React Testing Library
- **Backend**: Use pytest for unit and integration tests
- **E2E**: Use Playwright for end-to-end testing

### Test Guidelines

- Write tests for new features
- Maintain or improve test coverage
- Test edge cases and error conditions
- Mock external dependencies
- Keep tests fast and reliable

## Documentation

### API Documentation

- Backend API docs are auto-generated via FastAPI
- Update docstrings for API endpoints
- Include request/response examples

### Code Documentation

- Document complex algorithms or business logic
- Update README.md for significant changes
- Keep inline comments current

### User Documentation

- Update user guides for new features
- Include screenshots for UI changes
- Write clear setup instructions

## Community

### Getting Help

- **Issues**: Open GitHub issues for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our Discord server (link in README)

### Communication Guidelines

- Be respectful and professional
- Provide context and details
- Search existing issues before creating new ones
- Use clear, descriptive titles

### Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Project documentation credits

## Development Tips

### Common Commands

```bash
# Development
pnpm dev              # Start all services
pnpm build            # Build all apps
pnpm lint             # Run linting
pnpm lint:fix         # Fix linting issues
pnpm format           # Format code
pnpm check-types      # Type checking

# Specific apps
turbo run dev --filter=frontend
turbo run dev --filter=backend
```

### Debugging

- **Frontend**: Use browser dev tools and React Developer Tools
- **Backend**: Use FastAPI's automatic interactive docs at `/docs`
- **WebSocket**: Test connections using browser dev tools or WebSocket clients

### Performance

- Monitor bundle sizes for frontend changes
- Profile Python code for backend performance
- Test with realistic video file sizes
- Verify WebSocket connection stability

## Questions?

If you have questions about contributing, please:

1. Check existing documentation
2. Search GitHub issues and discussions
3. Create a new discussion or issue
4. Reach out to maintainers

We appreciate your contributions and look forward to building amazing AI-powered music experiences together! 🚀

---

*Happy coding! 🎵*