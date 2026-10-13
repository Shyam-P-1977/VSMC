# 🚗 VSCMS — Vehicle Service Center Management System

A production-grade, full-stack **Vehicle Service Center Management System (VSCMS)** built with a clean, decoupled architecture: **Flask (Python)** backend, **SQLite** database via Flask-SQLAlchemy, and a responsive **React (Vite) + Tailwind CSS** frontend with a distinctive **Deep Teal + Signal Yellow** design language.

---

## 🌟 Key Features

### 👤 Customer Experience
- **Public Showcase & Service Catalog:** 10-section landing page with interactive estimate calculator, service offerings, how-it-works timeline, customer testimonials carousel, embedded OpenStreetMap workshop locator, and lead contact form.
- **Role Toggle & Instant Demo Login:** 1-click credential auto-fill for Admin, Mechanics, and Customers.
- **Digital Garage (My Vehicles):** Add and manage vehicles with Indian-style number plates (`MH12AB1234`), fuel type, make, model, and year.
- **5-Step Booking Wizard:**
  - Vehicle selection & catalog packages.
  - **Comprehensive Problem Diagnosis Step:** Multi-select problem categories (Engine, Brakes, AC, Battery, etc.), checkbox symptoms, timeline and frequency selectors, safety alert banner for Urgent requests, and browser **Web Speech API** voice dictation.
  - Multi-photo damage upload (drag-and-drop previews, max 3 photos up to 5 MB).
  - Live atomic slot selection with instant concurrency protection.
- **My Bookings & Real-Time Timeline:** Live lifecycle tracker (`Pending` → `Assigned` → `In Progress` → `Awaiting Parts` → `Completed`), order cancellation with automatic slot release.
- **Invoices & Mock Payment Gateway:** Itemized bills with Labour, Parts, 18% GST, and discounts. Interactive payment checkout simulation with **UPI**, **Credit/Debit Card**, **NetBanking**, and instant downloadable receipts.

### 🔧 Mechanic Workbench
- **Job Isolation:** Strict server-enforced data privacy — mechanics can access and update **only** work orders assigned to them.
- **State Machine Enforcement:** Legitimate lifecycle transitions (`Assigned` → `In Progress` ⇄ `Awaiting Parts` → `Completed`).
- **Live Inventory Deduction & Replenishment:** Automatic stock deductions upon logging parts; automatic parts restoration upon removal; validation prevents logging out-of-stock components.
- **Labour Logging:** Log task descriptions, hours spent, hourly rates, and technician repair notes.
- **Job Sign-Off:** Enforces completion prerequisites (minimum 1 labour item, parts check, and auto-invoice generation).

### 🛡️ Admin Command Center
- **Executive KPI Dashboard:** Real-time metrics for pending bookings, active repair bay jobs, revenue realization, and low-stock alerts with visual charts.
- **Dispatch Queue:** Smart dispatch drawer showing available, active mechanics, current job loads, and specializations.
- **Customer & Staff Management:** Searchable directory, create accounts, temporary credentials, and account activation controls.
- **Mechanic Protection Rule:** Technicians with active ongoing jobs **cannot** be deactivated or deleted.
- **Service Catalog & Daily Slot Capacity:** Add/edit services and customize maximum capacity limits for hourly slots.
- **Warehouse Inventory:** Stock tracker with reorder thresholds, low-stock badges, and add/edit part modals.
- **Invoices, Manual Billing & Adjustments:** Record counter payments (Cash/POS) and record post-billing adjustments on paid invoices (preserving immutable tax audit trails).
- **Reports & Analytics:** Filterable reporting suite (Revenue, Bookings, Inventory Valuation, Mechanic Performance) with Recharts graphs and one-click CSV export.
- **Contact Messages Inbox:** View leads submitted from the public landing page with direct call and mailto links.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19 (Vite), Plain JavaScript (No TypeScript), React Router v6, Tailwind CSS, Framer Motion, Recharts, Lucide React, React Hot Toast, Axios |
| **Backend** | Python Flask (Blueprint Architecture), Flask-SQLAlchemy, Flask-CORS, PyJWT (HMAC-SHA256), Passlib (Bcrypt) |
| **Database** | SQLite3 (`vscms.db`, single file with `PRAGMA foreign_keys=ON`) |
| **Tests** | Pytest with 11 core business logic test suites |

---

## 🎨 Design Theme & Tokens

The application follows the design theme detailed in [`frontend/DESIGN.md`](frontend/DESIGN.md):
- **Deep Teal (`#04403F`, `#065F5B`, `#D8F0EE`):** Professional confidence, technical expertise.
- **Signal Yellow (`#FFD60A`):** High-contrast CTAs, status badges, active indicators, and hand-drawn decorations.
- **Ink (`#0F1B1B`) & Light Gray (`#F3F5F5`):** Balanced typography and soft backgrounds.
- **Typography:** Display headlines in **Bebas Neue** and **Oswald**, body and UI elements in **Poppins**.
- **Visuals:** Hand-crafted SVG squiggles, sparkles, dotted connection grids, pill buttons, layered 16–24px rounded cards, and light/dark mode toggling.

---

## 🚀 Local Development Workflow (Windows)

### 1️⃣ Prerequisites
- **Python 3.10+** (Python 3.12 / 3.14 tested)
- **Node.js 18+** & **npm**

---

### 2️⃣ Backend Setup

```powershell
# Navigate to backend directory
cd c:\Users\saksh\Desktop\VSMS\backend

# Create virtual environment (optional if using global Python)
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed initial database records (Safe & Idempotent)
python seed.py

# Launch Flask development server
python app.py
```

- **Backend Base URL:** `http://127.0.0.1:5000`
- **Health Check:** `http://127.0.0.1:5000/api/health`
- **Database File:** `backend/vscms.db` (created automatically on startup)

---

### 3️⃣ Frontend Setup

```powershell
# Navigate to frontend directory in a separate terminal
cd c:\Users\saksh\Desktop\VSMS\frontend

# Install node dependencies
npm install

# Start Vite development server
npm run dev
```

- **Frontend App URL:** `http://localhost:5173`
- **Authentication Route:** `http://localhost:5173/login`

---

### 4️⃣ Automated Tests

Execute the comprehensive business logic test suite covering all 11 critical domain rules:

```powershell
cd c:\Users\saksh\Desktop\VSMS\backend
pytest -v
```

**Verified Test Coverage:**
1. `test_duplicate_vehicle_registration_rejected` — Vehicle registration numbers unique across all customers.
2. `test_duplicate_user_email_rejected` — Email and phone numbers unique per account.
3. `test_overbooking_prevention_and_alternate_slots` — Atomic concurrency locks prevent slot overselling.
4. `test_illegal_status_transitions` — Strict state machine validation on work orders.
5. `test_mechanic_job_isolation` — Mechanics blocked from viewing or altering others' jobs.
6. `test_parts_deduction_and_insufficient_stock` — Auto-deduction of warehouse stock and out-of-stock rejection.
7. `test_invoice_calculation_accuracy` — Accurate itemization: Labour + Parts + 18% GST − Discount.
8. `test_paid_invoice_immutability` — Paid invoices cannot be edited/deleted directly; adjustments enforced.
9. `test_payment_gateway_mock_failure_and_retry` — Payment simulation failure handling and retry.
10. `test_attachment_validation_and_access_control` — Safe MIME type checking and file access isolation.
11. `test_inactive_mechanic_login_blocked` — Deactivated mechanics blocked from logging in.

---

## 🔑 Demo Credentials

All test accounts are pre-seeded in the database and accessible via the **quick demo chips** on the `/login` screen:

| Role | Email | Password | Access / Sample Data |
|---|---|---|---|
| **Workshop Admin** | `admin@vscms.com` | `Admin@123` | Full workshop control, dispatch drawer, analytics, inventory |
| **Senior Mechanic** | `mech1@vscms.com` | `Mech@123` | Specialist in Engine & Overhaul; active jobs assigned |
| **Mechanic 2** | `mech2@vscms.com` | `Mech@123` | Specialist in Electrical & Diagnostics |
| **Mechanic 3** | `mech3@vscms.com` | `Mech@123` | Specialist in Brakes & Suspension |
| **Customer 1** | `cust1@vscms.com` | `Cust@123` | Vehicles: `MH12AB1234`, `KA01CD5678` |
| **Customer 2** | `cust2@vscms.com` | `Cust@123` | Vehicle: `DL03EF9012` |
| **Customer 3** | `cust3@vscms.com` | `Cust@123` | Vehicle: `HR26GH3456` |

---

## 📁 Project Structure

```
vscms/
│
├── backend/
│   ├── app.py                      # Flask application factory, CORS & DB initialization
│   ├── config.py                   # Environment config & JWT parameters
│   ├── extensions.py               # Shared SQLAlchemy instance
│   ├── models.py                   # 17 normalized SQLAlchemy models
│   ├── seed.py                     # Idempotent seeding script
│   ├── requirements.txt            # Python dependencies (pinned bcrypt==4.0.1)
│   ├── .env.example                # Sample environment variables
│   ├── routes/
│   │     ├── auth.py               # Registration, Login, Profile
│   │     ├── vehicle.py            # Vehicle registration & service history
│   │     ├── catalog.py            # Services & dynamic hourly slot generator
│   │     ├── request.py            # Bookings, problem description & attachments
│   │     ├── mechanic.py           # Technician workbench & dispatch
│   │     ├── inventory.py          # Spare parts & low-stock alerts
│   │     ├── billing.py            # Invoices, adjustments & mark-as-paid
│   │     ├── payment.py            # Mock payment gateway endpoints
│   │     ├── notification.py       # Notification center
│   │     ├── report.py             # Revenue, volume, inventory & staff reports
│   │     ├── admin.py              # Customer & mechanic admin operations
│   │     ├── contact.py            # Landing page inquiry submissions
│   │     └── utils.py              # JWT @token_required & @role_required decorators
│   ├── services/
│   │     ├── booking_service.py    # Atomic slot booking & alternate slot suggestion
│   │     ├── billing_service.py    # Invoice generator & adjustment ledger
│   │     ├── inventory_service.py  # Stock deductions & low-stock triggers
│   │     ├── payment_gateway.py    # Mock gateway state machine (UPI/Card/NetBanking)
│   │     └── notification_service.py # Mock SMS/Email dispatcher
│   ├── uploads/                    # Secure image attachment storage
│   └── tests/
│         └── test_rules.py         # 11 comprehensive automated domain tests
│
├── frontend/
│   ├── index.html                  # HTML5 shell with Google Fonts preloads
│   ├── package.json                # Dependencies & build scripts
│   ├── vite.config.js              # Vite server & proxy configuration
│   ├── tailwind.config.js          # Theme design tokens & custom colors
│   ├── DESIGN.md                   # Complete UX/UI specification & style guide
│   ├── public/images/              # Asset illustrations & icons
│   └── src/
│        ├── main.jsx               # React DOM root
│        ├── App.jsx                # App shell, Context Providers & Toaster
│        ├── app/
│        │     ├── router.jsx       # Route registry with React.lazy code splitting
│        │     ├── context/         # AuthContext & ThemeContext
│        │     ├── guards/          # ProtectedRoute & ErrorBoundary
│        │     └── layouts/         # LandingLayout & DashboardLayout (Sidebar)
│        ├── shared/
│        │     ├── config/          # Problem categories & symptom definitions
│        │     └── ui/              # Accessible design system (22+ components)
│        ├── api/                   # Centralized Axios client & feature modules
│        └── features/
│              ├── landing/         # 10-section public landing page
│              ├── auth/            # Login (with role toggle) & Register pages
│              ├── customer/        # Customer portal, vehicles, wizard & payments
│              ├── mechanic/        # Technician job execution workbench
│              └── admin/           # Admin command center & management suite
│
└── README.md                       # Comprehensive guide & documentation
```

---

## 🚗 Complete End-to-End Walkthrough Demonstration

To verify the complete system workflow for your viva or project presentation:

1. **Book as Customer:**
   - Log in as `cust1@vscms.com`.
   - Go to **Book Service** wizard. Select vehicle `MH12AB1234`.
   - Pick services (e.g. *General Service* + *Brake Repair*).
   - In the **Problem Description** step, select *Brakes* and *Engine noise*, pick symptoms, choose *Urgent*, record a voice note or type an issue, and pick a scheduled time slot.
   - Confirm booking. Work Order status is created as `Pending`.

2. **Dispatch as Admin:**
   - Log out and log in as `admin@vscms.com`.
   - Go to **Work Orders & Bookings** (or the Dashboard pending list).
   - Click **Assign** on the pending order, select an available mechanic (`mech1`), and submit. Status transitions to `Assigned`.

3. **Service as Mechanic:**
   - Log in as `mech1@vscms.com`.
   - The assigned work order appears under **My Active Jobs**.
   - Click **Start Work** (`In Progress`).
   - Add spare parts used (e.g., *Front Brake Pads* - stock auto-deducts in real time).
   - Add labour hours and repair notes.
   - Click **Sign-Off & Complete**. Status transitions to `Completed`, mechanic is freed, and an unpaid invoice is generated.

4. **Pay Online as Customer:**
   - Log back in as `cust1@vscms.com`.
   - Navigate to **Invoices & Billing**.
   - Click **Pay Online** on the generated invoice.
   - Choose **UPI** (e.g., `cust1@okhdfcbank`) or **Card**, test payment processing with simulated delay, and receive a **Payment Receipt** with unique transaction ID.
   - Invoice is marked `Paid` and vehicle service history is updated.
