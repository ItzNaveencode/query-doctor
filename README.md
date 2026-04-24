![Status](https://img.shields.io/badge/status-live-success)
![Backend](https://img.shields.io/badge/backend-Node.js-green)
![Frontend](https://img.shields.io/badge/frontend-React-blue)
![Database](https://img.shields.io/badge/database-PostgreSQL-blue)
![Deployment](https://img.shields.io/badge/deployed-Vercel%20%7C%20Render-purple)
# 🚀 QueryDoctor — AI Database Performance Assistant

## 🔍 Overview
QueryDoctor analyzes PostgreSQL queries, detects performance issues, and provides safe, explainable optimization suggestions without modifying production systems.

## 🌐 Live Demo
Frontend: https://query-doctor.vercel.app  
Backend: https://query-doctor-api.onrender.com  

⚠️ Backend may take ~30–50 seconds on first request (free tier cold start).

## 💡 Why I Built This
While working with databases, I noticed that identifying slow queries and deciding whether to add indexes is often guesswork.

I built QueryDoctor to:
- Make query optimization explainable
- Avoid risky production changes
- Provide data-backed decisions using simulation

## ⚙️ Features
- Detects sequential scans and inefficiencies
- Suggests safe CREATE INDEX queries
- Simulates performance improvement
- Shows cost before vs after
- Evaluates write penalty and storage impact
- Blocks unsafe queries (INSERT, UPDATE, DELETE, DROP)

## 🏗️ Tech Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL (Neon)
- Deployment: Vercel + Render

## 🔒 Safety
- Only SELECT queries allowed
- No automatic execution of SQL
- Query timeout protection
- Input validation

## 🏗️ Architecture

Frontend (React)  
↓  
Backend API (Node.js)  
↓  
Analyzer Engine  
↓  
Simulator + Risk Engine  
↓  
PostgreSQL (Neon)

## 🤖 MCP (Model Context Protocol) Integration

QueryDoctor includes an MCP server that exposes database analysis tools to LLM agents.

This allows AI systems to:
- Fetch slow queries
- Analyze execution plans
- Get optimization recommendations

Note: The current web UI uses REST APIs, while MCP is designed for agent-based integrations.

## 🚀 Run Locally
```bash
git clone https://github.com/ItzNaveencode/query-doctor.git
cd query-doctor
npm install
node src/index.js
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## 👨‍💻 Author
Naveen Mydur
