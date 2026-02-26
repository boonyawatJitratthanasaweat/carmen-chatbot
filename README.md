# Carmen Chatbot System

Welcome to the **Carmen Chatbot System**. This repository contains a full-stack, AI-powered conversational agent system featuring a FastAPI backend, an embeddable chat widget, and a dedicated frontend interface.

## 🚀 Features

- **AI-Powered Chat**: Integrates with Google GenAI and OpenRouter for intelligent responses.
- **RAG System**: Built-in Retrieval-Augmented Generation capabilities using ChromaDB and BM25.
- **Embeddable Widget**: A modular, dynamic chat widget that can be easily added to any website.
- **Admin & Logs**: Admin APIs to track conversation logs, analyze metrics, and manage the knowledge base.
- **Streaming Responses**: Real-time response streaming.

## 📁 Project Structure

- `backend/`: FastAPI server providing all AI, RAG, and administrative endpoints.
- `carmen-chatbot-widget/`: The embeddable Node.js/Javascript chat widget.
- `frontend/`: The administrative interface and chatbot dashboard.
- `images/`: Stores assets and uploaded images.
- `scripts/`: Utility scripts for project-related tasks.
- `carmen_knowledge_db/`: Vector database for RAG context.
- `DEVELOPER.md`: In-depth architecture and technical guides for developers.

## 🛠️ Prerequisites

- Python 3.9+
- Node.js & npm (for the widget)
- [Google AI Studio API Key](https://aistudio.google.com/)
- [OpenRouter API Key](https://openrouter.ai/)

## ⚙️ Setup and Installation

### 1. Configuration

1. **Navigate to the root directory** and configure your environment variables:
   Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

   Open the `.env` file and insert your API keys (`GOOGLE_API_KEY`, `OPENROUTER_API_KEY`).

### 2. Backend Setup

1. **Create a virtual environment and install dependencies**:

   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Run the Backend Server**:

   ```bash
   cd backend
   python main.py
   # Or using uvicorn directly:
   # uvicorn main:app --reload
   ```

### 3. Widget Setup

1. **Navigate to the widget directory**:

   ```bash
   cd carmen-chatbot-widget
   ```

2. **Install node dependencies**:

   ```bash
   npm install
   ```

3. **Run the development server**:

   ```bash
   npm run dev
   ```

4. **Build the widget for production**:

   ```bash
   npm run build
   ```

## 📚 Documentation

For deeper technical understanding of the architecture and services, please refer to the [DEVELOPER.md](./DEVELOPER.md) guide.

## 📄 License & Contribution

Please ensure all sensitive files and `.env` containings are excluded via `.gitignore` before pushing to the repository.
