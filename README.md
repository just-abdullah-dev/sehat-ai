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
