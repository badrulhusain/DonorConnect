# AmanahTrack — Donor Communication Automation System

A production-ready MERN application that automates WhatsApp notifications when a donor payment is recorded. Built for campus donation management.

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  React UI   │────▶│  Express API     │────▶│  MongoDB     │
│  (Tailwind) │     │  (JWT Auth)      │     │  (Mongoose)  │
└─────────────┘     └────────┬─────────┘     └──────────────┘
                             │ setImmediate (non-blocking)
                    ┌────────▼─────────┐
                    │  WhatsApp Service│────▶ Meta Cloud API
                    │  (3x retry)      │
                    └──────────────────┘
```

---

## Quick Start (Local)

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Meta WhatsApp Business Account

### 1. Clone & Install

```bash
git clone <repo>
cd DonorConnect

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env with your actual credentials
```

**Required `.env` values:**
| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string (32+ chars) |
| `WHATSAPP_PHONE_NUMBER_ID` | From Meta Developer Dashboard |
| `WHATSAPP_ACCESS_TOKEN` | Permanent access token |
| `WHATSAPP_TEMPLATE_NAME` | Approved template name |
| `ADMIN_EMAIL` | Seed admin email |
| `ADMIN_PASSWORD` | Seed admin password |

### 3. WhatsApp Template Setup

Create an approved template in Meta Business Manager:

**English template** (`donor_payment_confirmation`):
```
Hello {{1}}, We received your contribution of {{2}}. Thank you 🤍
```

**Malayalam template** (`donor_payment_confirmation_ml`):
```
നമസ്കാരം {{1}}, ₹{{2}} സംഭാവന ലഭിച്ചു. നന്ദി 🤍
```

Both templates need to be approved by Meta before use.

### 4. Start Services

**Terminal 1 — Backend API:**
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
# Opens http://localhost:3000
```

### Default Admin Credentials
```
Email:    admin@amanahtrack.com
Password: Admin@123456
```
Change these in `.env` before seeding.

---

## Docker Deployment

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f backend
docker-compose logs -f worker
```

Access at: `http://localhost:3000`

---

## Deploy to Railway

1. Create a Railway project
2. Add services: MongoDB, Redis, Backend (Node), Worker (Node), Frontend (Static)
3. Set environment variables in Railway dashboard
4. Link your GitHub repo and deploy

**Backend start command:** `node server.js`
**Worker start command:** `node queue/worker.js`

---

## Deploy to Render

### Backend
- Build Command: `npm install`
- Start Command: `node server.js`
- Add all `.env` variables in dashboard

### Worker (separate service)
- Start Command: `node queue/worker.js`

### Frontend
- Build Command: `npm install && npm run build`
- Publish Directory: `build`

---

## API Reference

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Admin login |
| GET | `/api/auth/me` | Get current admin |

### Donors
| Method | Route | Description |
|---|---|---|
| GET | `/api/donors` | List donors (search, pagination) |
| POST | `/api/donors` | Add donor |
| PUT | `/api/donors/:id` | Update donor |
| DELETE | `/api/donors/:id` | Soft-delete donor |
| GET | `/api/donors/analytics` | Dashboard stats |
| GET | `/api/donors/export/csv` | Export CSV |

### Payments
| Method | Route | Description |
|---|---|---|
| POST | `/api/mark-paid` | Mark single donor paid |
| POST | `/api/mark-paid/bulk` | Bulk mark paid |
| GET | `/api/logs` | Message logs |

### Example: Mark Paid
```bash
curl -X POST http://localhost:5000/api/mark-paid \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"donorId": "...", "amount": 500, "language": "en"}'
```

---

## Features

- **JWT Authentication** — Secure admin-only access
- **Donor Management** — Add, edit, deactivate donors
- **Payment Recording** — Single & bulk mark as paid
- **WhatsApp Automation** — Template messages via Meta Cloud API
- **Retry Logic** — 3-attempt exponential backoff (2s, 4s, 8s) built-in
- **Message Logs** — Full audit trail of every notification
- **Analytics Dashboard** — Totals, averages, delivery rate
- **CSV Export** — Download all donor data
- **Search & Filter** — Real-time donor search
- **Multi-language** — English & Malayalam message support
- **Responsive UI** — Works on mobile and desktop

---

## Security

- Helmet.js HTTP security headers
- Rate limiting (100 req/15min global, 10 req/15min on login)
- JWT token validation on all protected routes
- Phone number E.164 format validation
- Input sanitization via express-validator
- MongoDB injection protection via Mongoose
- Environment variables for all secrets

---

## Project Structure

```
DonorConnect/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── donorController.js
│   │   └── paymentController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── Admin.js
│   │   ├── Donor.js
│   │   └── MessageLog.js
│   ├── queue/
│   │   ├── redisConnection.js
│   │   ├── whatsappQueue.js
│   │   └── worker.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── donors.js
│   │   └── payments.js
│   ├── services/
│   │   └── whatsappService.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── seedAdmin.js
│   │   └── validators.js
│   └── server.js
└── frontend/
    └── src/
        ├── components/
        │   ├── common/Layout.jsx
        │   └── donors/
        │       ├── DonorTable.jsx
        │       ├── AddDonorModal.jsx
        │       ├── MarkPaidModal.jsx
        │       └── BulkMarkPaidModal.jsx
        ├── context/AuthContext.jsx
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── DashboardPage.jsx
        │   ├── DonorsPage.jsx
        │   └── LogsPage.jsx
        ├── services/api.js
        └── App.jsx
```
