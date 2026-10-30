# AI-Powered Cyber Threat Prediction & Auto-Defense System - Backend

## Overview
This is the FastAPI backend for the AI Cyber Threat Defense system. It provides user management, threat detection using machine learning, firewall policy auto-defense management, geolocation analytics, and comprehensive auditing.

## Tech Stack
- **FastAPI** (Python 3.10+)
- **PostgreSQL** + **SQLAlchemy** + **Alembic**
- **JWT** authentication + Argon2id password hashing
- **Scikit-Learn** for ML threat detection
- **SlowAPI** for rate limiting

## Setup Instructions

### 1. Environment Configuration
Copy `.env.example` to `.env` and fill in the required values:
```bash
cp .env.example .env
```
Make sure to set your `DATABASE_URL` to point to a valid PostgreSQL instance.

### 2. Install Dependencies
Create a virtual environment and install requirements:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Database Migrations
Run Alembic migrations to create the database schema:
```bash
alembic upgrade head
```

### 4. Run the Server
Start the FastAPI server using Uvicorn:
```bash
uvicorn app.main:app --reload
```

## Features Implemented
- Complete relational database schema for RBAC, Threat Detection, Firewall Rules, Analytics, etc.
- ML-based Threat Detection service (RandomForest/IsolationForest capabilities).
- JWT Authentication and Role-based Access Control.
- Rate Limiting and Background Task workers.

## Project Structure
- `app/api/`: FastAPI route handlers
- `app/core/`: Configuration, security, permissions
- `app/database/`: SQLAlchemy models and connection
- `app/schemas/`: Pydantic validation models
- `app/services/`: Core business logic (threat detection, defense policy, etc.)
- `app/workers/`: Background task functions
- `app/ml_models/`: Machine Learning training scripts and data generation
