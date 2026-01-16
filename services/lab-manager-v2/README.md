# Lab Manager v2

A redesigned lab management service with improved authentication and cleaner architecture.

## Features

- ✅ Secure authentication with email/password (bcrypt + JWT)
- ✅ Lab management (create, view, extend, reset)
- ✅ Admin dashboard (participants, invites, audit logs)
- ✅ Student dashboard (Mission Control)
- ✅ Cloud Run service creation
- ✅ DNS record management
- ✅ Firestore integration
- ✅ Email notifications (Resend)

## Architecture

- **Backend**: FastAPI (Python) with simplified authentication
- **Frontend**: React + TypeScript + Vite
- **Database**: Google Cloud Firestore
- **Infrastructure**: Google Cloud Run, DNS, Secret Manager

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
export GCP_PROJECT=your-project-id
export JWT_SECRET_KEY=your-secret-key
export CORS_ALLOW_ORIGINS=http://localhost:5173
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
export VITE_API_BASE_URL=http://localhost:8000/api/v1
npm run dev
```

## Default Users

The system seeds two initial users on startup:

- **Admin**: `alexb@imperva.com` / `Admin123!`
- **Student**: `alexbak@gmail.com` / `Student123!`

⚠️ **Change these passwords immediately in production!**

## Environment Variables

### Backend

- `GCP_PROJECT`: GCP project ID
- `FIRESTORE_DB`: Firestore database (default: "(default)")
- `JWT_SECRET_KEY`: Secret key for JWT tokens
- `CORS_ALLOW_ORIGINS`: Comma-separated list of allowed origins
- `GCP_REGION`: GCP region (default: "us-east1")
- `DNS_ZONE_NAME`: DNS zone name
- `DNS_ZONE_DOMAIN`: DNS zone domain
- `ATTACK_CLIENT_IMAGE`: Cloud Run container image
- `AIR_ORIGIN_HOSTNAME`: Air origin hostname
- `RESEND_API_KEY`: Resend API key for emails

### Frontend

- `VITE_API_BASE_URL`: Backend API URL (default: "http://localhost:8000/api/v1")

## Docker

### Backend

```bash
cd backend
docker build -t lab-manager-api .
docker run -p 8080:8080 -e GCP_PROJECT=your-project lab-manager-api
```

### Frontend

```bash
cd frontend
docker build -t lab-manager-ui .
docker run -p 80:80 lab-manager-ui
```

## License

Internal use only.
