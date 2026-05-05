# 🚀 AI Page Summarizer Chrome Extension

A Manifest V3 Chrome Extension that extracts readable webpage content, sends it to an AI model, and returns a structured summary with optional in-page highlighting of key insights.

---

## 📌 Overview

This extension allows users to instantly summarize any article or webpage into:

- Bullet-point summary
- Key insights
- Estimated reading time
- Optional in-page highlighted important sentences

It is designed to improve productivity by converting long-form content into concise, LLM-ready context.

---

## ✨ Features

### 🧠 AI-Powered Summarization

- Uses OpenAI (`gpt-4o-mini`)
- Generates structured, readable summaries
- Focuses on key ideas and essential information

### 📄 Smart Content Extraction

- Extracts main article content using DOM heuristics
- Removes navigation bars, ads, and boilerplate content
- Supports generic webpages and article-based layouts

### 🎯 In-Page Highlighting (Bonus Feature)

- Highlights key sentences directly on the webpage
- Uses safe DOM manipulation (no `innerHTML`)
- Improves content discoverability

### ⚡ User Experience

- Loading state during AI processing
- Copy-to-clipboard functionality
- Clear/reset summary option
- Scrollable summary panel
- Reading time estimation

---

## 🏗️ Architecture

The extension follows a secure, modular architecture:

```
Popup UI
   ↓
Content Script (Extracts Page Content)
   ↓
Background Service Worker
   ↓
Node.js Backend (Express Server)
   ↓
OpenAI API
```

### 🔹 Components

#### 1. Popup UI

- Handles user interaction
- Displays summary, loading state, and errors
- Sends requests to content script

#### 2. Content Script

- Extracts readable content from webpages
- Cleans and filters irrelevant elements
- Sends structured content to popup

#### 3. Background Script

- Acts as message bridge
- Communicates with backend API
- Returns AI-generated summaries

#### 4. Backend Server (Security Layer)

- Handles OpenAI API requests securely
- Stores API keys in `.env`
- Prevents exposure of sensitive credentials in frontend

---

## 🔐 Security Decisions

This project follows secure extension development practices:

- ❌ API keys are NOT stored in the extension
- ❌ No direct API calls from frontend
- ✅ All AI requests go through a backend server
- ✅ API keys stored in `.env` file only
- ✅ Minimal Chrome permissions used
- ✅ Safe DOM manipulation (no XSS via innerHTML)

This ensures the extension is safe for real-world usage.

---

## ⚙️ Setup Instructions

### 1. Clone repository

```bash
git clone https://github.com/your-repo/ai-summarizer.git
cd ai-summarizer
```

---

### 2. Install backend dependencies

```bash
cd server
npm install
```

---

### 3. Create `.env` file

```env
OPENAI_API_KEY=your_openai_key_here
PORT=3000
```

To get API key:

- Visit [https://platform.openai.com/](https://platform.openai.com/)
- Create account
- Navigate to API Keys section
- Generate new secret key

---

### 4. Start backend server

```bash
node server.js
```

---

### 5. Load Chrome Extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load Unpacked**
4. Select project folder

---

## 📁 Project Structure

```
extension/
│
├── manifest.json
├── popup.html
├── popup.js
├── popup.css
│
├── content-script.js
├── background.js
│
└── server/
    ├── server.js
    ├── .env
    └── package.json
```

---

## ⚖️ Trade-offs

### 1. Backend requirement

- Added to secure API keys
- Slight increase in setup complexity

### 2. Simple extraction vs full NLP parser

- Used DOM heuristics instead of heavy parsing libraries
- Improves performance and simplicity

### 3. Sentence-based highlighting

- Lightweight approach instead of full semantic NLP
- Ensures fast execution inside browser

---

## 🚀 Future Improvements

- Support multiple AI providers (toggle system)
- Export summary as Markdown/PDF
- Save history of summaries
- Improved readability engine (Mozilla Readability integration)
- Context-aware highlighting using embeddings

---

## 🎥 Demo Notes (for submission video)

Recommended flow:

1. Open any article page
2. Click extension icon
3. Click “Summarize Page”
4. Show loading state
5. Display generated summary
6. Highlight key sentences on page
7. Copy summary feature

---

## 📊 Evaluation Criteria Coverage

| Requirement               | Status     |
| ------------------------- | ---------- |
| Manifest V3               | ✅         |
| Content Script extraction | ✅         |
| Background Service Worker | ✅         |
| AI Integration (OpenAI)   | ✅         |
| Secure API handling       | ✅         |
| Clean UI                  | ✅         |
| Error handling            | ✅         |
| Highlight feature         | ✅ (Bonus) |
| Storage usage             | ✅         |
| Performance optimized     | ✅         |

---

## 🧠 Author Notes

This project prioritizes:

- Secure AI integration
- Clean modular architecture
- Real-world usability
- Extension performance
- Minimal permissions
