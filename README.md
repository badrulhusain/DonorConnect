# AmanahTrack — Donor Communication Automation System

A production-ready MERN application that automates WhatsApp notifications when a donor payment is recorded. Fully free to run — no Docker, no Redis, no paid services required.

---

## Architecture

```
┌─────────────┐     ┌──────────────────────┐     ┌──────────────┐
│  React UI   │────▶│  Express API         │────▶│  MongoDB     │
│  (Tailwind) │     │  (JWT Auth)          │     │  (Mongoose)  │
└─────────────┘     └──────────┬───────────┘     └──────────────┘
                               │ in-memory MessageQueue (500ms/send)
                    ┌──────────▼───────────┐
                    │  WhatsApp Service    │────▶ Meta Cloud API
                    │  (3× retry backoff)  │
                    └──────────────────────┘
```

No Redis. No BullMQ. No Docker required for local development or free-tier deployment.

---

## Quick Start (Local — no Docker)

### Prerequisites
- Node.js 18+
- MongoDB (local install **or** free MongoDB Atlas cluster)
- Meta WhatsApp Business Account

### 1. Clone & Install

```bash
git clone <repo>
cd DonorConnect

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
# Fill in your actual credentials
```

**Required `.env` values:**

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string (32+ chars) |
| `WHATSAPP_PHONE_NUMBER_ID` | From Meta Developer Dashboard |
| `WHATSAPP_ACCESS_TOKEN` | Permanent access token |
| `WHATSAPP_TEMPLATE_NAME` | Approved payment confirmation template |
| `WHATSAPP_TEMPLATE_NAME_GENERAL` | Approved announcement template |
| `ADMIN_EMAIL` | Seed admin email |
| `ADMIN_PASSWORD` | Seed admin password |

### 3. WhatsApp Template Setup

Create and get these templates approved in **Meta Business Manager → WhatsApp → Message Templates**:

**Payment confirmation — English** (`donor_payment_confirmation`):
```
Hello {{1}}, We received your contribution of {{2}}. Thank you 🤍
```

**Payment confirmation — Malayalam** (`donor_payment_confirmation_ml`):
```
നമസ്കാരം {{1}}, ₹{{2}} സംഭാവന ലഭിച്ചു. നന്ദി 🤍
```

**General announcement** (`general_announcement`):
```
{{1}}
```
*(Single body variable — your full message text goes here)*

All three must be approved by Meta before they can be sent.

### 4. Start Services

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev   # http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start     # http://localhost:3000
```

### Default Admin Credentials
```
Email:    admin@amanahtrack.com
Password: Admin@123456
```
Override via `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`.

---

## Free Deployment (No Docker)

### Database — MongoDB Atlas (free forever)

1. Sign up at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free **M0** cluster
3. Create a database user and whitelist `0.0.0.0/0`
4. Copy the connection string → use as `MONGODB_URI`

### Backend — Render.com (free tier)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your GitHub repo, set:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
4. Add all variables from `.env.example` in the **Environment** tab
5. Set `CLIENT_URL` to your Vercel frontend URL (fill in after step below)

### Frontend — Vercel (free tier)

1. Go to [vercel.com](https://vercel.com) → **New Project** → import repo
2. Set **Root Directory** to `frontend`
3. Add environment variable:
   - `REACT_APP_API_URL` = `https://<your-render-backend>.onrender.com/api`
4. Deploy — Vercel builds and serves the React app automatically

> **Note:** Render free-tier instances spin down after 15 minutes of inactivity.
> The first request after idle may take ~30 s to wake the backend.

### Optional — Docker Compose (local only)

A `docker-compose.yml` is included for local development convenience:

```bash
# Requires: Docker + a filled-in backend/.env
docker-compose up -d --build
# Frontend → http://localhost:3000
# Backend  → http://localhost:5000
```

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
| POST | `/api/mark-paid` | Mark single donor paid + queue WhatsApp |
| POST | `/api/mark-paid/bulk` | Bulk mark paid + queue WhatsApp |
| GET | `/api/logs` | Message delivery logs |

### Messages
| Method | Route | Description |
|---|---|---|
| POST | `/api/messages/send-bulk` | Send announcement to selected donors |
| GET | `/api/messages/progress/:jobId` | SSE stream — live send progress |

#### Bulk send example
```bash
curl -X POST https://<host>/api/messages/send-bulk \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"donorIds": ["..."], "message": "Ramadan Mubarak!"}'
# → { "success": true, "data": { "jobId": "uuid", "total": 12 } }
```

#### SSE progress stream
```js
const es = new EventSource(`/api/messages/progress/${jobId}?token=${jwt}`);
es.addEventListener('progress', (e) => console.log(JSON.parse(e.data)));
// { donorId: "...", status: "sent" | "failed" }
es.addEventListener('done', () => es.close());
```

---

## Features

- **JWT Authentication** — Secure admin-only access
- **Donor Management** — Add, edit, deactivate donors
- **Payment Recording** — Single & bulk mark as paid
- **WhatsApp Automation** — Template messages via Meta Cloud API
- **Bulk Announcements** — Send any message to selected donors with live progress
- **In-memory Rate Queue** — 500 ms between sends, respects Meta rate limits, zero infra
- **SSE Progress** — Real-time per-donor status (✓ sent / ✗ failed) streamed to browser
- **Retry Logic** — 3-attempt exponential backoff (2 s, 4 s, 8 s)
- **Message Logs** — Full audit trail of every notification
- **Analytics Dashboard** — Totals, averages, delivery rate
- **CSV Export** — Download all donor data
- **Multi-language** — English & Malayalam message support
- **Responsive UI** — Works on mobile and desktop

---

## Security

- Helmet.js HTTP security headers
- Rate limiting (100 req/15 min global, 10 req/15 min on login)
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
│   │   ├── messageController.js   ← bulk send + SSE progress
│   │   └── paymentController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── Admin.js
│   │   ├── Donor.js
│   │   └── MessageLog.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── donors.js
│   │   ├── messages.js            ← /send-bulk, /progress/:jobId
│   │   └── payments.js
│   ├── services/
│   │   └── whatsappService.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── messageQueue.js        ← in-memory rate-limited queue
│   │   ├── seedAdmin.js
│   │   └── validators.js
│   └── server.js
└── frontend/
    └── src/
        ├── components/
        │   ├── common/Layout.jsx
        │   └── donors/
        │       ├── AddDonorModal.jsx
        │       ├── BulkMarkPaidModal.jsx
        │       ├── BulkSendMessageModal.jsx  ← new
        │       ├── DonorTable.jsx
        │       └── MarkPaidModal.jsx
        ├── context/AuthContext.jsx
        ├── pages/
        │   ├── DashboardPage.jsx
        │   ├── DonorsPage.jsx
        │   ├── LoginPage.jsx
        │   └── LogsPage.jsx
        ├── services/api.js
        └── App.jsx
```
