# Sehat AI - Application & Backend Documentation

This document provides a comprehensive technical overview of the **App** (Frontend) and **Backend** directories for the Sehat AI project. It is intended to serve as a detailed reference for generating the Final Year Project (FYP) documentation. 

Sehat AI is a medical image analysis platform designed to detect Tuberculosis (TB) and Pneumonia from chest X-rays using deep learning models, featuring a mobile app frontend and a secure, containerized backend.

---

## 1. Backend Architecture & Details

The backend is built as a robust, scalable REST API using Python and FastAPI. It handles user authentication, data storage, ML model inference, and report generation.

### 1.1 Technology Stack
*   **Framework:** FastAPI (Python 3.10+)
*   **Server:** Uvicorn (ASGI)
*   **Database:** PostgreSQL (with SQLAlchemy ORM and psycopg2)
*   **Authentication:** JWT (JSON Web Tokens) with passlib & bcrypt
*   **Machine Learning:** TensorFlow/Keras, NumPy, Pillow (Image Processing)
*   **Reporting:** ReportLab (for PDF generation)
*   **Deployment:** Docker, Docker Compose

### 1.2 Directory Structure (`/Backend`)
*   **`app/`**: Core application logic.
    *   **`api/`**: Contains API route definitions (endpoints).
        *   `auth.py`: User registration, login, token refresh.
        *   `prediction.py`: Endpoints to handle image upload and ML inference.
        *   `history.py`: Retrieves user scan history.
        *   `reports.py`: Handles generating and serving PDF reports.
    *   **`core/`**: Core configurations and setup (database setup, security & JWT utilities, application settings via Pydantic, logging config).
    *   **`models/`**: SQLAlchemy database models (`User`, `ScanHistory`).
    *   **`schemas/`**: Pydantic models for data validation and serialization/deserialization of requests and responses.
    *   **`services/`**: Business logic layer (authentication services, prediction execution, history querying, PDF generation logic).
    *   **`ml/`**: Machine Learning handlers.
        *   `model_loader.py`: Loads the `.h5` models at startup and keeps them in memory.
        *   `preprocessing.py`: Image resizing, grayscale conversion, and normalization.
        *   `predictor.py`: Routes the image to the correct model (TB or Pneumonia) and calculates the prediction confidence.
    *   **`utils/`**: Helper scripts, specifically file validation (type/size limits).
*   **`ml_models/`**: Storage for pre-trained deep learning models (`tb_model.h5`, `pneumonia_model.h5`).
*   **`uploads/` & `reports/`**: Directories for temporary image storage and generated PDF files.
*   **`migrate.py`**: Database migration and initialization script.
*   **`Dockerfile` / `docker-compose.yml`**: Containerization specifications for deployment.

### 1.3 Key Functionalities
1.  **Memory-Resident Models**: The `.h5` deep learning models are loaded into RAM during server startup for low-latency inference (less than 10 seconds per request).
2.  **JWT Authentication**: Secures endpoints to ensure that history and prediction endpoints are restricted to authenticated users.
3.  **PDF Report Generation**: Dynamically creates downloadable medical reports containing user information, scan image, model prediction, and confidence score.
4.  **Database Management**: Uses PostgreSQL to track user accounts and maintain a historical log of their medical scans.

---

## 2. Frontend Architecture & Details

The frontend (`App` directory) is a mobile application built using React Native and Expo, offering a seamless cross-platform experience (Android and iOS). 

### 2.1 Technology Stack
*   **Framework:** React Native, Expo, Expo Router
*   **Navigation:** React Navigation (integrated via Expo Router)
*   **State Management / Data Fetching:** React Hooks, Context API
*   **Networking:** Axios
*   **Form Management:** Formik & Yup (for validation)
*   **UI Components:** `@expo/vector-icons`, `react-native-chart-kit`
*   **Localization:** `i18next`, `react-i18next`
*   **Storage:** Secure Store (`expo-secure-store`), Async Storage (`@react-native-async-storage`)

### 2.2 Directory Structure (`/App`)
*   **`app/`**: Utilizes Expo's file-based routing mechanism.
    *   **`(auth)/`**: Screens related to authentication (Login, Registration).
    *   **`(tabs)/`**: Main application screens accessible via a bottom tab navigator. Includes `index.tsx` (Home/Dashboard).
    *   `_layout.tsx`: Root layout defining app-wide wrappers (providers, root navigators).
    *   `modal.tsx`, `privacy-policy.tsx`, `terms-of-service.tsx`: Auxiliary app screens.
*   **`src/`**: Custom application source code.
    *   **`context/`**: React Context definitions for global state (e.g., authentication state, user preferences).
    *   **`hooks/`**: Custom React hooks for code reusability.
    *   **`services/`**: API interaction layer using Axios. Abstracts backend endpoints into callable functions.
    *   **`types/`**: TypeScript type declarations for strict type-checking across the app.
    *   **`utils/`**: General helper utilities (e.g., date formatting, data transformers).
*   **`components/`**: Reusable UI components (buttons, text inputs, cards, custom headers) used across multiple screens.
*   **`assets/`**: Static files like images, icons, and custom fonts.
*   **`constants/`**: Global constants, themes, color palettes, and configurations.
*   **`locales/` & `i18n/`**: Localization files to support multiple languages (e.g., English and Urdu).
*   **`package.json` & `app.json`**: Expo configuration and dependency definitions.

### 2.3 Key Functionalities
1.  **Intuitive User Interface**: Provides a user-friendly dashboard to navigate between TB and Pneumonia screening workflows.
2.  **Hardware Integration**: Utilizes Expo modules (`expo-image-picker`, `expo-file-system`) to capture chest X-rays via device camera or local gallery.
3.  **Form Validation**: Formik and Yup ensure that user inputs (e.g., during sign up) are strictly validated before hitting the backend.
4.  **Multi-Language Support**: i18n implementation allows seamless switching between English and Urdu.
5.  **Data Visualization**: Uses `react-native-chart-kit` to visually display scan history and confidence scores.

---

## 3. Integration & Interaction (App <-> Backend)
*   **API Communication**: The App uses Axios to send HTTP requests to the Backend's FastAPI endpoints.
*   **Security Protocol**: Upon successful login, the backend issues a JWT. The App stores this token securely and attaches it to the `Authorization` header of subsequent API requests.
*   **Image Upload Protocol**: X-ray images selected on the mobile device are wrapped as `multipart/form-data` and sent via `POST /predict/` to the backend for inference. The backend processes the file, runs the TensorFlow model, and returns the prediction and confidence score as a JSON response.
*   **PDF Fetching**: Reports generated on the backend can be requested by the frontend and subsequently downloaded to the mobile device for viewing or sharing.
