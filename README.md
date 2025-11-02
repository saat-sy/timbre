# Timbre

AI-powered video soundtrack generation using multimodal analysis and serverless orchestration.

## Overview

Serverless pipeline that analyzes video content and generates custom soundtracks through:
- **Multimodal Analysis**: Scene detection, audio transcription, visual sampling via Bedrock Agent
- **Music Generation**: SageMaker MusicGen for 30-second audio segments  
- **Composition**: FFmpeg-based audio-video mixing with temporal synchronization

## Problem

Most video content lacks appropriate background music, and creating custom soundtracks requires:
- Musical expertise and composition skills
- Understanding of video pacing and emotional flow
- Time-intensive manual editing and synchronization
- Expensive licensing for existing music

Timbre automates this process through AI analysis and generation.

## Solution

End-to-end pipeline that transforms any video into a soundtrack-enhanced version:

- AI agent coordinates multiple tools to understand video content
- Creates music that matches the video's mood and pacing
- Automatically mixes generated audio with original video
- Professional-grade composition with fade transitions and balancing

## Architecture

Three-tier serverless architecture on AWS:

- **Frontend**: Next.js 14 with Cognito auth and real-time job tracking ([docs/frontend.md](./docs/frontend.md))
- **Backend**: Step Functions orchestrating Lambda microservices ([docs/architecture.md](./docs/architecture.md))
- **Agent**: Bedrock agent using ReAct pattern for video analysis ([docs/agent.md](./docs/agent.md))

## Project Structure

```
apps/
├── frontend/          # Next.js application
├── backend/           # AWS SAM serverless API  
└── agent/             # Bedrock Agent with multimodal tools
packages/
├── ui/                # Shared React components
├── eslint-config/     # Linting configuration
└── typescript-config/ # TypeScript configuration
docs/
├── frontend.md        # Frontend architecture
├── architecture.md    # Backend architecture  
└── agent.md           # Agent design
```

### Processing Reality

**Pipeline Duration**: 5-10 minutes total processing time
- **Analysis**: 0.5-1 minutes (multimodal agent coordination)
- **Audio Generation**: 2-10 minutes (SageMaker async inference + polling)
- **Composition**: 1-3 minutes (FFmpeg processing)
- **Overhead**: Step Functions coordination, S3 transfers

**Current Limitations**:
- **Slow Processing**: Not real-time, requires patience for quality results
- **30-Second Segments**: MusicGen model constraint limits audio length
- **Cost**: Multiple AWS services accumulate charges quickly
- **Single Video**: No batch processing, one video at a time
- **No Preview**: Must wait for full pipeline completion

This is a **proof-of-concept** prioritizing quality over speed.
