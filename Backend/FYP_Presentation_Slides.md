# SehatAI - FYP Presentation

---

## Slide 1: Title Slide

**SehatAI: AI-Powered Mobile Health Diagnostic System**

**Tuberculosis & Pneumonia Detection from Chest X-Rays**

*Final Year Project - 8th Semester Presentation*

*[Your Names]*

*[Date]*

*Department of Computer Science*

---

## Slide 2: Problem Statement & Motivation

### Problem Statement

**Global Health Crisis:**
- Tuberculosis (TB) and Pneumonia are major causes of mortality worldwide
- Limited access to radiologists, especially in rural and remote areas
- Traditional diagnosis process is time-consuming and error-prone
- Patients face long waiting times for appointments and diagnosis results

**The Challenge:**
- Hours or even **days of waiting** for doctor appointments
- Manual diagnosis requires expert radiologists
- Critical time loss in emergency situations
- Lack of accessible diagnostic tools in underserved areas

### Motivation

**Instant Results - The Game Changer:**
- Get an **instant prediction** before visiting a hospital
- Saves hours or even days of waiting time
- **Especially valuable in:**
  - Rural areas with limited healthcare access
  - Emergency situations requiring immediate attention
  - Resource-constrained healthcare settings

**Empowering Patients & Healthcare Providers:**
- **For Patients:**
  - Simply get a chest X-ray scan and receive instant results
  - Make informed decisions about whether to visit a doctor
  - No registration required - guest users can also use the app
  - Track health progress over time with scan history

- **For Doctors & Clinicians:**
  - Quick preliminary screening tool
  - Visualize patient improvement or deterioration over time
  - Aid in faster decision-making during consultations

**Digital Health Innovation:**
- Leverage AI and mobile technology for accessible healthcare
- Low-cost, user-friendly solution
- Contribute to improving healthcare outcomes globally

---

## Slide 3: Previous Evaluation Comments

### Feedback Received in Previous Evaluation

1. **ML Model Enhancement Required**
   - Need to improve model accuracy and performance
   - Optimize model architecture for better predictions
   - Implement proper validation techniques

2. **Problem Definition Clarity**
   - Better articulation of problem, solution, and key differentiator
   - Emphasize the "instant result" aspect as main value proposition
   - Define target user groups clearly

3. **Accessibility Features**
   - Allow guest users to perform scans without registration
   - Remove barriers to entry for immediate health screening

4. **User Experience Focus**
   - Ensure seamless scan history tracking
   - Visualize health trends over time
   - Design for both patients and clinicians

5. **Practical Implementation**
   - Focus on deployment strategy
   - Consider real-world usage scenarios
   - Ensure system reliability and scalability

---

## Slide 4: Progress Update - UI/UX Development 

### Mobile Application Interface - Completed

**Authentication & Onboarding:**
- Login/Registration screens with proper validation
- Guest user access - scan without registration
- Secure JWT-based authentication
- Password reset functionality

**Core Features:**
- **Home Dashboard:** Clean interface showing scan options (TB/Pneumonia)
- **Scan Upload:** Camera integration + gallery upload with preview
- **Results Display:** Clear visualization of prediction results
  - Confidence scores
  - Risk levels with color coding
  - Actionable recommendations

**User Management:**
- **Scan History:** Complete history of all previous scans
- **Timeline View:** Visualize health trends over time
- **Profile Management:** User preferences and settings

**Design Highlights:**
- Intuitive navigation with bottom tab bar
- Responsive design for various screen sizes
- Clean, modern UI following material design principles
- Urdu language support planned for next phase

---

## Slide 5: Progress Update - Pneumonia Detection Model

### Pneumonia Model Architecture & Performance

**Model Architecture:**
- **Base:** Custom CNN with Separable Convolutions
- **Input Size:** 180 × 180 × 3 (RGB)
- **Total Parameters:** 3,496,801 (13.34 MB)
- **Trainable Parameters:** 3,494,433

**Architecture Highlights:**
```
Input (180×180×3)
├── Conv2D Layers (16, 16 filters)
├── Separable Conv2D Blocks (32, 64, 128, 256 filters)
├── MaxPooling2D (progressive downsampling)
├── Batch Normalization (stability)
├── Dropout Layers (regularization)
├── Dense Layers (512 → 128 → 64 → 1)
└── Sigmoid Output (Binary Classification)
```

**Key Features:**
- Separable convolutions for efficiency
- Multiple batch normalization layers for training stability
- Progressive dropout (preventing overfitting)
- Optimized for mobile deployment

**Training Configuration:**
- Data augmentation (rotation, zoom, shifts)
- Class imbalance handling with weighted loss
- Early stopping and learning rate reduction
- Train/Val/Test split: 80/10/10

**Current Status:**
- Model trained and validated
- Integrated into backend API
- Ready for optimization phase

**Next Steps:**
- Model quantization for mobile
- Performance optimization
- Cross-validation with diverse datasets

---

## Slide 6: Progress Update - Tuberculosis Detection Model

### TB Model Architecture & Performance

**Model Architecture:**
- **Base:** DenseNet121 (Transfer Learning)
- **Pre-trained on:** ImageNet
- **Input Size:** 320 × 320 × 3 (RGB)
- **Fine-tuned for:** TB vs Normal Classification

**Architecture Details:**
```
DenseNet121 (Pre-trained)
├── Dense Blocks with Growth Rate
├── Transition Layers
├── Global Average Pooling
├── Dense Layer (512 units)
└── Sigmoid Output (Binary Classification)
```

**Performance Metrics:**
- **Accuracy:** 83.33%
- **Precision (Normal):** 0.83
- **Recall (Normal):** 1.00
- **Training Time:** ~3-4 hours (3 epochs)

**Advanced Features:**
- **Grad-CAM Visualization:**
  - Highlights affected areas in X-rays
  - Provides visual explanation for predictions
  - Helps doctors understand AI decision-making

- **Class Imbalance Handling:**
  - Weighted loss function
  - Positive weight: 0.8, Negative weight: 0.2
  - Addresses dataset imbalance (TB: 700, Normal: 3500)

**Dataset:**
- Total Images: 4,200
- Normal: 3,500 | TB: 700
- Split: Train (3,360) | Val (420) | Test (420)

**Training Details:**
- Optimizer: Adam
- Batch Size: 8
- Data Augmentation: Rotation, zoom, shifts
- Normalization: Batch-wise samplewise

**Current Status:**
- Model saved as .h5 file
- Integrated with backend API
- Predictions working correctly

**Next Steps:**
- Improve model accuracy (target: >90%)
- Model optimization for faster inference
- Expand dataset for better generalization

---

## Slide 7: Progress Update - Backend Development

### Backend API - Fully Functional

**Technology Stack:**
- **Framework:** FastAPI (Python)
- **Database:** SQLite (with SQLAlchemy ORM)
- **Authentication:** JWT tokens with refresh mechanism
- **ML Framework:** TensorFlow/Keras
- **Deployment Ready:** Uvicorn ASGI server

**Completed APIs:**

**1. Authentication APIs:**
```
POST /api/auth/register     - User registration
POST /api/auth/login        - User login (JWT tokens)
POST /api/auth/refresh      - Token refresh
GET  /api/auth/me          - Get current user
POST /api/auth/logout      - User logout
```

**2. Prediction APIs:**
```
POST /api/predict/pneumonia  - Pneumonia detection
POST /api/predict/tb         - TB detection
```
- Accepts chest X-ray images
- Returns prediction with confidence score
- Stores prediction in database
- Response time: ~2-3 seconds

**3. History APIs:**
```
GET /api/history/           - Get user scan history
GET /api/history/{id}       - Get specific scan details
```

**4. Reports APIs:**
```
GET /api/reports/stats      - User health statistics
GET /api/reports/trends     - Health trends over time
```

**Features Implemented:**
- Image preprocessing pipeline
- Model loading and caching
- Error handling and logging
- Input validation
- Guest user support (optional authentication)

**Current Status:**
- All APIs tested and working
- No errors in execution
- Ready for frontend integration

---

## Slide 8: Timeline for 8th Semester Implementation

### January - February 2026

**Week 1-2: Frontend-Backend Integration**
- Connect mobile app with backend APIs
- Implement API client and error handling
- End-to-end testing of all features
- Fix integration bugs

**Week 3-4: Model Optimization**
- Fine-tune pneumonia model for better accuracy
- Improve TB model (target accuracy: >90%)
- Model compression and quantization
- Test on diverse datasets

### March 2026

**Week 1-2: Language Support**
- Implement Urdu language translation
- Localize all UI text and messages
- Test with native Urdu speakers
- Add language switcher in settings

**Week 3-4: AI Health Assistant (Stretch Goal)**
- Design question flow for symptom checking
- Integrate conversational AI
- Provide contextual health guidance
- **Features:**
  - Ask questions like doctors do (symptoms, duration, severity)
  - Analyze answers along with X-ray results
  - Suggest next steps (visit doctor, monitor at home, etc.)
  - General health precautions and natural remedies
  - **No medicine prescription** - only guidance

### April 2026

**Week 1-2: Backend Deployment**
- Deploy FastAPI backend on cloud (AWS/Azure/Heroku)
- Set up production database
- Configure CI/CD pipeline
- SSL certificate and security hardening

**Week 3-4: Mobile App Deployment**
- Test on real devices (Android/iOS)
- Beta testing with users
- Play Store/App Store submission
- Documentation and user guides

### May 2026

**Week 1-2: Testing & QA**
- Comprehensive testing (unit, integration, E2E)
- Performance optimization
- Security audit
- User acceptance testing

**Week 3-4: Final Documentation & Presentation**
- Complete FYP documentation
- Prepare demo videos
- Final presentation preparation
- Project handover

### Buffer Time
- Address feedback from advisors
- Fix critical bugs
- Performance improvements
- Additional features if time permits

---

## Slide 9: Deliverables & Expected Outcomes

### Technical Deliverables

**1. Mobile Application**
- Cross-platform mobile app (React Native/Flutter)
- Available on Android (minimum)
- iOS version (if time permits)
- Guest access + registered user features

**2. AI Models**
- Pneumonia detection model (optimized)
- Tuberculosis detection model (>90% accuracy)
- Model files ready for deployment
- Documentation on model architecture

**3. Backend System**
- RESTful API with FastAPI
- Deployed on cloud infrastructure
- Scalable and maintainable codebase
- API documentation (Swagger/OpenAPI)

**4. Database**
- User management system
- Scan history storage
- Health trends tracking
- Secure data handling

**5. Optional: AI Health Assistant**
- Conversational interface
- Symptom checker
- Health guidance system

### Functional Outcomes

**For Patients:**
- Instant TB/Pneumonia screening from X-rays
- No appointment needed for initial screening
- Track health progress over time
- Make informed decisions about doctor visits
- Free access as guest user

**For Healthcare Providers:**
- Preliminary screening tool
- Reduce diagnostic time
- Visualize patient history
- Aid in clinical decision-making

**For Healthcare System:**
- Reduce burden on radiologists
- Faster screening in rural areas
- Early detection and intervention
- Cost-effective diagnostic support

### Project Documentation

1. **FYP Report (Complete)**
   - Abstract and Introduction
   - Literature Review
   - Methodology and Architecture
   - Implementation Details
   - Results and Evaluation
   - Conclusion and Future Work

2. **Technical Documentation**
   - API documentation
   - Model training notebooks
   - Deployment guides
   - User manuals

3. **Presentation Materials**
   - PowerPoint presentation
   - Demo videos
   - Code repository (GitHub)

### Expected Impact

**Accessibility:**
- Bridge healthcare gap in underserved areas
- Provide instant health screening

**Efficiency:**
- Save time for both patients and doctors
- Reduce healthcare system burden

**Innovation:**
- Demonstrate AI application in healthcare
- Contribute to digital health ecosystem

### Success Metrics

- Model accuracy: >85% for both TB and Pneumonia
- Response time: <3 seconds for predictions
- User satisfaction: Positive feedback from beta testing
- Successful deployment on cloud platform
- Working mobile app with all core features

---

## Slide 10: Summary & Next Steps

### Project Summary

**What We've Achieved:**
- Fully functional backend with ML models integrated
- UI/UX designs completed
- Authentication and authorization working
- Both TB and Pneumonia models trained
- APIs ready for integration

**What Makes Us Different:**
- **Instant Results** - no waiting for appointments
- **Guest Access** - no barriers to entry
- **Dual Model** - both TB and Pneumonia detection
- **Health Tracking** - visualize trends over time
- **For Everyone** - patients, doctors, clinicians

### Immediate Next Steps (Next 2 Weeks)

1. Start frontend-backend integration
2. Begin model optimization experiments
3. Set up cloud deployment infrastructure
4. Plan Urdu localization strategy

### Questions?

**Thank you for your attention!**

*We welcome your feedback and suggestions.*

---

## Additional Notes for Presenters

### Key Points to Emphasize:

1. **The "Why" - Instant Results:**
   - This is our main differentiator
   - Real-world impact: saves hours/days
   - Especially critical in emergencies and rural areas

2. **Accessibility:**
   - Guest user feature removes barriers
   - Mobile-first approach
   - Works where it's needed most

3. **Progress Made:**
   - Backend 100% complete and tested
   - UI designs ready
   - Models trained and working
   - Ready for integration phase

4. **Realistic Timeline:**
   - 4 months to complete
   - Clear milestones
   - Buffer time for issues
   - Focus on core features first

5. **Social Impact:**
   - Addresses real healthcare challenges
   - Serves underserved communities
   - Complements (not replaces) doctors

### Demo Preparation:

- Show backend running without errors
- Display API responses with predictions
- Show UI mockups/designs
- If possible, demo end-to-end flow

### Potential Questions & Answers:

**Q: How accurate are your models?**
A: Current TB model: 83.33%, Pneumonia model is trained. Target is >85-90% for deployment. We're in optimization phase.

**Q: Is this meant to replace doctors?**
A: No, it's a preliminary screening tool. We emphasize "consult a doctor" in all recommendations.

**Q: What about false positives?**
A: We handle this by showing confidence scores and always recommending professional consultation for any concerning results.

**Q: Timeline feasibility?**
A: Backend is done, models are trained. Integration, optimization, and deployment are well within 4 months.

**Q: What happens after FYP?**
A: If successful, we'd like to continue development, add more diseases, get medical certifications, and deploy widely.
