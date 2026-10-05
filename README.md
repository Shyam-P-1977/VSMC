# Vehicle Service Center Management System (VSCMS)

The full-stack application is now complete! I have fully implemented the frontend using React (Vite) + Tailwind CSS following the phase-by-phase build order and adhering to the premium design specification without leaving any placeholders. 

## What's Completed

### 1. **Backend API (Flask & SQLite)**
- Fully implemented the REST API in `backend/`.
- Auth, Role-based Access Control (Admin, Customer, Mechanic).
- Services: Booking, Inventory management, Services Catalog, Reporting, Payments, and Notifications.
- Data seeding via `seed.py` for testing purposes.

### 2. **Frontend Foundation (React & Vite)**
- Robust authentication context (`AuthContext.jsx`) and Axios interceptors for JWT injection and error handling.
- A modern UI component library (`components/ui.jsx`) utilizing Tailwind CSS for beautiful styling, dark/light modes, micro-animations, and reusable components (Modals, Toasts, Cards, Data Tables).

### 3. **Role-Specific Dashboards**
- **Admin**: Dashboard with real-time stats and charts, Pending Requests, Bookings, Inventory (with low-stock alerts), Mechanics, Customers, Service Catalog, Slots/Settings, Invoices, and Reports.
- **Customer**: Dashboard, Garage (Vehicles), Booking Flow (4-step visual flow), Active Bookings, Service History, Invoices, and built-in Payment flow (Card/UPI).
- **Mechanic**: Active Jobs list, Job Editor (for adding parts, logging labour hours, completing jobs), and Job History.

## How to Run the Application

You can now start the application locally. Since it has separate backend and frontend servers, you'll need two terminal windows:

### 1. Start the Backend Server (Terminal 1)
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
*(The backend runs on http://127.0.0.1:5000)*

### 2. Start the Frontend Server (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```
*(The frontend will run on http://localhost:5173)*

### Test Accounts
You can log in with any of the seeded accounts:
- **Admin**: `admin@vscms.local` | Password: `password123`
- **Mechanic**: `rohit@vscms.local` | Password: `password123`
- **Customer**: `amit@example.com` | Password: `password123`
