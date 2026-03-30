# 🧠 DocMind AI

<p align="center">
  <b>Turn PDFs into an AI-powered knowledge system</b><br/>
  Ask questions • Get cited answers • Understand documents instantly
</p>

<p align="center">
  <a href="https://docmind-ebon.vercel.app">
    <img src="https://img.shields.io/badge/🚀 Live Demo-Visit-blue?style=for-the-badge" />
  </a>
  <a href="https://docmind-production.up.railway.app">
    <img src="https://img.shields.io/badge/⚙️ Backend API-View-purple?style=for-the-badge" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-green?style=flat-square" />
  <img src="https://img.shields.io/badge/AI-Claude-purple?style=flat-square" />
  <img src="https://img.shields.io/badge/VectorDB-ChromaDB-red?style=flat-square" />
  <img src="https://img.shields.io/badge/Database-SQLite-orange?style=flat-square" />
</p>

---

## 🎥 Demo

<p align="center">
  <img src="demo.gif" width="95%" />
</p>

---

## 🚀 What is DocMind AI?

DocMind AI is a **production-ready AI document assistant** that lets users interact with PDFs using natural language.

Instead of manually searching through documents, users can:

- Ask questions and get **instant answers**
- See **exact source citations (page-level)**
- Query across **multiple documents at once**

---


## 🧠 Key Capabilities

### 🔍 Intelligent Retrieval (RAG)
- Context-aware semantic search using embeddings  
- Chunking + vector indexing with ChromaDB  
- Accurate grounding using retrieved context  

### ⚡ Real-Time AI Experience
- Streaming responses (typewriter effect)  
- Low-latency interaction design  
- Continuous answer generation  

### 📚 Multi-Document Intelligence
- Query across multiple PDFs simultaneously  
- Unified semantic search layer  
- Context merging across documents  

### 🔐 Secure Authentication
- JWT-based authentication  
- Google OAuth (one-click login)  
- Microsoft OAuth integration  

### 📄 Seamless UX
- In-app PDF preview  
- Chat history persistence  
- Dark/Light mode  
- Drag-and-drop uploads  
- Real-time search  

---

## 🏗️ System Architecture

```
                ┌──────────────────────────┐
                │        Frontend          │
                │   React + TypeScript    │
                │      (Vercel CDN)       │
                └──────────┬──────────────┘
                           │
                           ▼
                ┌──────────────────────────┐
                │        Backend           │
                │     FastAPI (Python)     │
                │      (Railway)           │
                └───────┬────────┬────────┘
                        │        │
                        ▼        ▼
               ┌────────────┐ ┌────────────┐
               │ ChromaDB   │ │  SQLite    │
               │ (Vectors)  │ │ (Users/Chat)│
               └──────┬─────┘ └──────┬─────┘
                      │              │
                      ▼
               ┌───────────────┐
               │ Claude API    │
               │ (LLM Engine)  │
               └───────────────┘
```

---

## ⚙️ How It Works (Pipeline)

1. **PDF Upload**
   - Extract text using PyMuPDF  
   - Split into semantic chunks  

2. **Embedding + Storage**
   - Generate embeddings  
   - Store in ChromaDB  

3. **User Query**
   - Convert query → embedding  
   - Retrieve top-k relevant chunks  

4. **RAG Generation**
   - Send context + query to Claude  
   - Generate grounded response  

5. **Streaming Output**
   - Stream tokens in real-time to UI  

---

## 🛠️ Tech Stack

| Layer           | Technology                      | Why It Was Used                  |
|----------------|--------------------------------|----------------------------------|
| Frontend       | React, TypeScript, Vite        | Fast, scalable UI                |
| Backend        | FastAPI (Python)               | High-performance async APIs      |
| AI             | Anthropic Claude API           | Reliable LLM reasoning           |
| Vector DB      | ChromaDB                       | Lightweight semantic search      |
| Database       | SQLite + SQLAlchemy            | Simple persistent storage        |
| Authentication | JWT + OAuth                    | Secure access control            |
| PDF Processing | PyMuPDF                        | Efficient text extraction        |
| Deployment     | Vercel + Railway               | Production hosting               |

---

## 🚀 Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Anthropic API Key

---

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env`:

```env
ANTHROPIC_API_KEY=your_api_key
GOOGLE_CLIENT_ID=your_google_client_id
```

Run:

```bash
uvicorn main:app --reload
```

---

### Frontend

```bash
cd frontend
npm install
```

Create `.env`:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_MICROSOFT_CLIENT_ID=your_microsoft_client_id
```

Run:

```bash
npm run dev
```

---

## 🔑 Environment Variables

### Backend

| Variable           | Description            |
|--------------------|------------------------|
| ANTHROPIC_API_KEY  | Claude API key         |
| GOOGLE_CLIENT_ID   | OAuth client ID        |

### Frontend

| Variable                  | Description                  |
|---------------------------|------------------------------|
| VITE_GOOGLE_CLIENT_ID     | Google OAuth ID              |
| VITE_MICROSOFT_CLIENT_ID  | Microsoft OAuth ID           |

---

## 📦 Deployment

### Backend → Railway
- Connect GitHub repo  
- Set root directory → `backend`  
- Add environment variables  
- Deploy  

### Frontend → Vercel
- Connect GitHub repo  
- Set root directory → `frontend`  
- Add environment variables  
- Deploy  

---

## 📊 Engineering Highlights

- Designed and implemented a full **RAG pipeline from scratch**  
- Built **real-time streaming AI responses**  
- Developed **multi-document semantic retrieval system**  
- Integrated **OAuth (Google + Microsoft)**  
- Delivered a **production-ready full-stack application**  

---

## 📈 Future Improvements

- Support for DOCX, TXT, and other formats  
- Advanced summarization + insights  
- Multi-user collaboration  
- PostgreSQL + scalable infra  
- Better ranking (hybrid search, reranking)  

---

## 🧾 Resume Impact (Use This 🔥)

> Built a production-grade AI document assistant using RAG architecture, enabling real-time question answering over PDFs with source citations. Implemented semantic search, OAuth authentication, and streaming responses using FastAPI, React, and Claude API.

---

## 🔗 Links

- 🌐 Live App: https://docmind-ebon.vercel.app  
- ⚙️ Backend: https://docmind-production.up.railway.app  

---

## 📄 License

MIT License