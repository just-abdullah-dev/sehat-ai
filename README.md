# SehatAI – AI-powered Rural Healthcare Assistant  

SehatAI is an AI-powered healthcare assistant for rural and public clinics in Pakistan.  
It provides:  
- **X-ray Analyzer** → Detect TB & Pneumonia.  
- **Prescription OCR** → Digitize Urdu/English prescriptions.  
- **Risk Scoring** → Predict diabetes & heart disease risk.  

This monorepo includes **frontend (Next.js)**, **backend (Flask)**, **AI models (PyTorch + OCR + Scikit-learn)**, and **documentation (MkDocs)**.  
All components are containerized with Docker.  

---

## 📂 Repository Structure  

sehat-ai/
├── frontend/ # Next.js UI
├── backend/ # Flask API
├── models/ # AI/ML inference services
├── docs/ # Documentation site
├── docker-compose.yml
├── README.md
└── .gitignore


---

## 🚀 Getting Started  

### Prerequisites  
- Docker & Docker Compose installed  
- Node.js 18+ (for local frontend dev, optional)  
- Python 3.10+ (for local backend/models dev, optional)  

---

## 🐳 Run with Docker  

### 🔹 Build & Run All Services Together  

```bash
docker-compose build
docker-compose up


Frontend → http://localhost:3000

Backend API → http://localhost:8000

Models → http://localhost:8500

Docs → http://localhost:8080

🔹 Build & Run Each Service Separately
Frontend (Next.js)
cd frontend
docker build -t sehat-frontend .
docker run -p 3000:3000 sehat-frontend

Backend (Flask API)
cd backend
docker build -t sehat-backend .
docker run -p 8000:8000 sehat-backend

Models (PyTorch + OCR + Risk Scoring)
cd models
docker build -t sehat-models .
docker run -p 8500:8500 sehat-models

Docs (MkDocs)
cd docs
docker build -t sehat-docs .
docker run -p 8080:8080 sehat-docs

🧪 Development Mode (Optional)

Frontend: cd frontend && npm run dev

Backend: cd backend && flask run

Models: cd models && python serve_models.py

Docs: cd docs && mkdocs serve
