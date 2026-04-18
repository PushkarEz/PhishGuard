# Architecture

## 🧩 Components
1. Chrome Extension (Frontend)
2. Backend Server (Flask - deployed on Render)
3. Phishing Detection Logic

## 🔄 Workflow
1. User visits a website
2. Extension captures the URL
3. Sends request to backend API
4. Backend analyzes URL
5. Returns result (safe / phishing)
6. Extension alerts the user

## ☁️ Deployment
- Backend hosted on Render  
- API accessible via live URL
