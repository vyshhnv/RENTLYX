# RentlyX

![Django](https://img.shields.io/badge/Django-5.2-092E20?style=flat&logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Ready-4169E1?style=flat&logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)
![Status](https://img.shields.io/badge/Status-In%20Development-orange?style=flat)

**RentlyX** is an AI-powered property rental platform designed to bring transparency, automation, and intelligence to the rental process — for both tenants and property owners.

---

## Overview

Most rental platforms are static listing boards. RentlyX is built to go further. By combining a robust full-stack architecture with AI-driven features, the platform aims to eliminate the guesswork, friction, and trust gaps that make renting difficult.

Tenants get smart search, fair pricing insights, and instant support. Landlords get automated document verification, booking management, and real-time communication — all in one place.

---

## AI Features

> **Note:** All AI features are currently in development. Data used at this stage is for demonstration purposes only, to showcase the capabilities that can be built on this platform. Full functionality will be available as real market data is collected and integrated.

### 🏷️ Locality-Based Rent Estimation
Analyzes live market data — including active listings, demand patterns, locality trends, and historical pricing — to generate a rent estimation model for each area. Landlords receive data-backed pricing recommendations when publishing a property. Tenants can assess in real time whether a listing reflects the actual market rate for that locality.

### 🤖 AI Chatbot Assistant
A 24/7 conversational assistant powered by a local LLM (Ollama) that handles tenant enquiries regarding properties, availability, and the rental process. Reduces manual response overhead for landlords while ensuring tenants always have access to timely information.

### 📄 Document Analyzer
Automatically processes uploaded documents — lease agreements, identity proofs, income statements — using OCR to extract and surface key information. Reduces manual review time and improves accuracy for both parties during the onboarding process.

### ✅ Owner Property Document Verification
Verifies ownership documents and legal clearances through AI-assisted checks before a property is published on the platform. Ensures every listing has been validated rather than self-reported, establishing a foundation of trust between landlords and prospective tenants.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 5.2, Django REST Framework, Django Channels |
| Frontend | React 19, Vite, Tailwind CSS, React Router v6 |
| Database | PostgreSQL (production), SQLite (development) |
| AI | Ollama, Scikit-learn, OCR |
| Payments | Razorpay (HMAC-SHA256 signature verification) |
| Real-Time | WebSockets via Django Channels |
| Infrastructure | Gunicorn, Nginx, Redis, Celery |

---

## Features

- 🔍 Property search with full-text search and pagination
- 📅 Booking system with atomic, transaction-safe payment processing
- 💬 Real-time messaging between tenants and landlords via WebSockets
- 👥 Multi-role authentication — tenants, owners, and admins
- 📧 Email OTP verification for account security
- ⭐ Property and user review system
- 🛡️ Rate limiting, input validation, and CSRF protection throughout

---

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- [Ollama](https://ollama.ai) — for AI features

### Backend

```bash
cd server/project1
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd client/project1
npm install
npm run dev
```

### AI Service

```bash
ollama pull mistral
python "main (1).py"
```

---

## Environment Variables

Create a `.env` file inside `server/project1/`:

```env
# Development
DEBUG=True
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3

# Production
DEBUG=False
SECRET_KEY=your-production-secret-key
ALLOWED_HOSTS=yourdomain.com
DATABASE_URL=postgresql://user:password@localhost:5432/rentlyx
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
RZP_KEY_ID=your-razorpay-key
RZP_KEY_SECRET=your-razorpay-secret
```

---

## API Reference

```
# Authentication
POST   /api/auth/login/
POST   /api/seller/login/
POST   /api/user/send-email-otp/
POST   /api/user/verify-email-otp/

# Properties
GET    /api/properties/
POST   /api/properties/
GET    /api/properties/{id}/
PUT    /api/properties/{id}/edit/
DELETE /api/properties/{id}/delete/

# Bookings
POST   /api/bookings/
GET    /api/bookings/user/
POST   /api/bookings/{id}/verify-payment/

# AI
POST   /api/ai/price/
POST   /api/chat/
```

---

## Running Tests

```bash
cd server/project1
python manage.py test --verbosity=2
```

---

## Contributing

Contributions, issues, and feature requests are welcome. This project is actively maintained and continuously improved.

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
