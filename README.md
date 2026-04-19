# AmanahTrack — WhatsApp Notification System

A production-ready MERN application for sending WhatsApp notifications to contacts — supporting bulk broadcasts, event invitations, programme invitations, and payment confirmations. Built for educational institutions in Kerala with English and Malayalam language support.

---

## Architecture

```
┌─────────────┐     ┌──────────────────────┐     ┌──────────────┐
│  React UI   │────▶│  Express API         │────▶│  MongoDB     │
│  (Tailwind) │     │  (JWT Auth)          │     │  (Mongoose)  │
└─────────────┘     └──────────┬───────────┘     └──────────────┘
                               │ batched (50/sec, 1s delay)
                    ┌──────────▼───────────┐
                    │  WhatsApp Service    │────▶ Gupshup API
                    │  (3× retry, backoff) │
                    └──────────────────────┘
```

---

## Features

- **JWT Authentication** — Secure admin-only access
- **Contact Management** — Add, edit, tag, and import contacts in bulk
- **Broadcast Messaging** — Send WhatsApp template messages to any group of contacts
- **Event Invitations** — Bulk invite contacts to events (English & Malayalam)
- **Programme Invitations** — Bulk invite contacts to programmes (English & Malayalam)
- **Payment Confirmations** — Notify contacts of received payments
- **CSV Upload** — Upload recipient lists via CSV file or paste directly
- **Message Preview** — Preview message content before sending
- **Notification Logs** — Full audit trail with filter by type, status, and date
- **Resend Failed** — One-click resend for failed notifications
- **Rate-limited Batching** — 50 messages/batch, 1-second delay (safe for Gupshup limits)
- **Retry Logic** — 3 attempts with smart error handling (401 permanent, 429 retry after 2s, 503 retry)
- **Multi-language** — English (`en`) and Malayalam (`ml`) templates
- **Responsive UI** — Works on mobile and desktop

---

## WhatsApp Templates (Gupshup)

Register all 6 templates in your Gupshup dashboard before going live:

| Template Name | Language | Variables |
|---|---|---|
| `payment_confirmation_en` | English | name, amount |
| `payment_confirmation_ml` | Malayalam | name, amount |
| `event_invitation_en` | English | name, eventName, date, time, venue |
| `event_invitation_ml` | Malayalam | name, eventName, date, time, venue |
| `programme_invitation_en` | English | name, programmeName, date, time, venue |
| `programme_invitation_ml` | Malayalam | name, programmeName, date, time, venue |

---

## Quick Start (Local)

### Prerequisites
- Node.js 18+
- MongoDB (local install **or** free MongoDB Atlas cluster)
- Gupshup account with an approved WhatsApp app

### 1. Clone & Install

```bash
git clone <repo>
cd DonorConnect

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
# Fill in your credentials
```

**Required `.env` values:**

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string (32+ chars) |
| `GUPSHUP_API_KEY` | Your Gupshup API key |
| `GUPSHUP_SOURCE_MOBILE` | Registered WhatsApp number (e.g. `+918888888888`) |
| `GUPSHUP_APP_NAME` | Your Gupshup app name |
| `ADMIN_EMAIL` | Seed admin email |
| `ADMIN_PASSWORD` | Seed admin password (min 8 chars) |

### 3. Start Services

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

### Default Admin
```
Email:    admin@amanahtrack.com
Password: Admin@123456
```
Override via `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`.

---

## Test Gupshup Integration

Before deploying, verify your credentials and templates work locally:

```bash
cd backend

# Test payment confirmation
node scripts/test-gupshup.js --type=payment --phone=+918593826375 --lang=en --name="John" --amount=5000

# Test event invitation (Malayalam)
node scripts/test-gupshup.js --type=event --phone=+918593826375 --lang=ml --name="Rahul" \
  --eventName="Annual Day" --date="25th April 2025" --time="10:00 AM" --venue="Auditorium"

# Test programme invitation (English)
node scripts/test-gupshup.js --type=programme --phone=+918593826375 --lang=en --name="Fathima" \
  --programmeName="Graduation" --date="30th April 2025" --time="3:00 PM" --venue="Main Hall"
```

---

## Deployment (Vercel)

### 1. Database — MongoDB Atlas (free)

1. Sign up at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free **M0** cluster
3. Create a database user, whitelist `0.0.0.0/0`
4. Copy the connection string → `MONGODB_URI`

### 2. Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

### 3. Add Environment Variables

In **Vercel Dashboard → Project → Settings → Environment Variables**, add all variables listed in `vercel-env-variables.txt`.

> **Vercel limits:** Serverless functions time out at 30 seconds. Keep recipient lists under ~150 per request for bulk sends. Split larger lists into multiple calls from the frontend.

---

## API Reference

### Auth
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | — | Admin login |
| GET | `/api/auth/me` | JWT | Get current admin |

### Contacts
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/contacts` | JWT | List contacts (search, pagination, tags) |
| GET | `/api/contacts/tags` | JWT | List all unique tags |
| POST | `/api/contacts` | JWT | Add contact |
| POST | `/api/contacts/import` | JWT | Bulk import contacts |
| PUT | `/api/contacts/:id` | JWT | Update contact |
| DELETE | `/api/contacts/:id` | JWT | Soft-delete contact |

### Broadcasts
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/broadcasts` | JWT | List broadcasts |
| GET | `/api/broadcasts/stats` | JWT | Broadcast statistics |
| POST | `/api/broadcasts` | JWT | Create broadcast |
| GET | `/api/broadcasts/:id` | JWT | Get broadcast details |
| POST | `/api/broadcasts/:id/send` | JWT | Trigger broadcast send |
| GET | `/api/broadcasts/:id/logs` | JWT | Delivery logs |
| DELETE | `/api/broadcasts/:id` | JWT | Delete draft broadcast |

### Notifications
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/notify/event` | JWT | Send event invitations |
| POST | `/api/notify/programme` | JWT | Send programme invitations |
| POST | `/api/notify/bulk-payment` | JWT | Send payment confirmations |
| GET | `/api/notify/logs` | JWT | Notification history (filterable) |
| POST | `/api/notify/resend/:id` | JWT | Resend a failed notification |

#### Event invitation example
```bash
curl -X POST https://<host>/api/notify/event \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      { "phone": "+918593826375", "name": "John", "language": "en" },
      { "phone": "+918593826376", "name": "Rahul", "language": "ml" }
    ],
    "eventName": "Annual Day 2025",
    "date": "25th April 2025",
    "time": "10:00 AM",
    "venue": "School Auditorium"
  }'
```

#### CSV format for bulk upload
```csv
name,phone,language
John,+918593826375,en
Rahul,+918593826376,ml
Fathima,+918593826377,ml
```
Language defaults to `en` if omitted. Invalid E.164 numbers are skipped with a report.

---

## Project Structure

```
DonorConnect/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── broadcastController.js
│   │   ├── contactController.js
│   │   ├── notificationController.js   ← event / programme / payment
│   │   └── webhookController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── Admin.js
│   │   ├── Broadcast.js
│   │   ├── BroadcastLog.js
│   │   ├── Contact.js
│   │   └── NotificationLog.js          ← new
│   ├── routes/
│   │   ├── auth.js
│   │   ├── broadcasts.js
│   │   ├── contacts.js
│   │   ├── notifications.js            ← new
│   │   └── webhook.js
│   ├── scripts/
│   │   └── test-gupshup.js             ← local integration test
│   ├── services/
│   │   └── whatsappService.js          ← Gupshup API
│   ├── utils/
│   │   ├── logger.js
│   │   ├── seedAdmin.js
│   │   └── validators.js
│   ├── .env.example
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── common/Layout.jsx
│       │   └── notifications/
│       │       ├── EventForm.jsx
│       │       ├── ProgrammeForm.jsx
│       │       └── NotificationHistory.jsx
│       ├── context/AuthContext.jsx
│       ├── pages/
│       │   ├── BroadcastLogsPage.jsx
│       │   ├── BroadcastsPage.jsx
│       │   ├── ContactsPage.jsx
│       │   ├── CreateBroadcastPage.jsx
│       │   ├── DashboardPage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── NotificationsPage.jsx   ← new
│       │   └── SettingsPage.jsx
│       ├── services/api.js
│       └── App.jsx
├── vercel.json
└── vercel-env-variables.txt
```

---

## Security

- Helmet.js HTTP security headers
- Rate limiting (100 req/15 min global, 10 req/15 min on login)
- JWT token validation on all protected routes
- Phone number E.164 format validation
- Input sanitization via express-validator
- MongoDB injection protection via Mongoose
- Environment variables for all secrets — never commit `.env`
