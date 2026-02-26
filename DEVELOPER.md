# Developer Guide: Carmen Chatbot System

This document provides technical details on the refactored architecture of the Carmen Chatbot system.

## Backend Architecture

The backend is built with FastAPI and localized into specialized services.

### Service Layer
- **`RetrievalService`**: Encapsulates all search logic. Uses ChromaDB for vector search and BM25 for keyword search.
- **`LLMService`**: Handles LLM orchestration via OpenRouter. Supports both standard and streaming chat.

### API Routing
All functional endpoints are prefixed with `/api` for better proxy management and clarity.
- `/api/chat`: AI chat operations.
- `/api/train`: Knowledge base and training management.
- `/api/admin`: Logs, analytics, and model management.

## Widget Architecture

The widget uses a modular manager-based pattern to separate concerns.

### Core Modules
- **`UIManager`**: Handles all visual updates, DOM manipulations, and animations.
- **`ChatManager`**: Manages the business logic of chat rooms, message state, and streaming.
- **`EventManager`**: Centralizes all event binding.

### State Management
- Room IDs are persisted in `localStorage`.
- The widget leverages the browser's `ReadableStream` API for real-time AI responses.

## Development Workflow

### Widget Development
1. Navigate to `carmen-chatbot-widget`.
2. Install dependencies: `npm install`.
3. Start dev server: `npm run dev`.
4. Build for production: `npm run build`.

### Backend Development
1. Navigate to `backend`.
2. Ensure `.env` is configured (Google API Key, OpenRouter Key).
3. Run the server: `python main.py` or `uvicorn main:app --reload`.
