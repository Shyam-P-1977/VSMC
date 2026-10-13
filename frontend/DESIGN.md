# VSCMS Design System & Architecture Specification (DESIGN.md)

## 1. Brand Identity & Visual Aesthetic
- **Personality**: Confident, friendly, engineered, dependable, high-precision automotive care.
- **Visual Motif**: Hand-drawn signal yellow squiggles, dynamic sparkle accents, dotted milestone connector lines, Indian-style vehicle registration plates, two-tone bold condensed headlines.
- **Section Pacing**: Rhythmic alternating full-width visual bands:
  - Band A: Crisp White (`#FFFFFF`) with deep teal typography.
  - Band B: Deep Teal (`#04403F` / `#065F5B`) with signal yellow highlights.
  - Band C: Ultra-soft Light Gray (`#F3F5F5` / `#F8FAFA`) for structured cards and comparisons.
  - Band D: Deep Ink Footer (`#0A0F0F`) with high-contrast amber/yellow CTAs.

---

## 2. Color Palette & Design Tokens

### Primary Palette (Teal & Yellow)
| Token Name | Hex Code | HSL Equivalent | Usage & Role |
| :--- | :--- | :--- | :--- |
| **Teal 950** | `#022B2A` | `hsl(178, 91%, 9%)` | Dark mode background, ultra-deep contrasts |
| **Teal 900** | `#04403F` | `hsl(179, 88%, 13%)` | Primary brand color, headers, hero accents, dark cards |
| **Teal 800** | `#054F4C` | `hsl(177, 82%, 16%)` | Sidebar hover states, active navigation |
| **Teal 700** | `#065F5B` | `hsl(177, 88%, 20%)` | Secondary brand surface, badges, accent borders |
| **Teal 500** | `#0D9488` | `hsl(175, 84%, 32%)` | Mid-tone highlights, interactive icons |
| **Teal 100** | `#D8F0EE` | `hsl(175, 48%, 90%)` | Light mode accent tints, badge backgrounds |
| **Teal 50**  | `#F0F9F8` | `hsl(175, 50%, 96%)` | Selected table row background, input focus ring |
| **Signal Yellow** | `#FFD60A` | `hsl(50, 100%, 52%)` | Primary action buttons, star ratings, hand-drawn squiggles, sparkles |
| **Yellow Hover** | `#E5C000` | `hsl(49, 100%, 45%)` | Pill button hover and active states |
| **Ink Black** | `#0F1B1B` | `hsl(180, 29%, 8%)` | High-emphasis body text, card outlines |
| **Muted Gray**| `#64748B` | `hsl(215, 16%, 47%)` | Subtext, timestamps, placeholders |
| **Light Gray**| `#F3F5F5` | `hsl(180, 5%, 96%)` | Alternating section backgrounds, card containers |
| **Dark Footer**| `#0A0F0F` | `hsl(180, 20%, 5%)` | Footer, terminal consoles, receipt headers |

### Critical Contrast Rule
> [!IMPORTANT]
> **Always use dark ink text (`#0F1B1B`) on Signal Yellow (`#FFD60A`)**. Yellow text on light/white surfaces is strictly prohibited to guarantee WCAG AA 4.5:1 legibility.

### Status Palette
- **Pending**: Amber (`bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300`)
- **Assigned**: Blue (`bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300`)
- **In Progress**: Teal (`bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300`)
- **Awaiting Parts**: Orange (`bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300`)
- **Completed**: Emerald/Green (`bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300`)
- **Cancelled**: Slate/Gray (`bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300`)
- **Unpaid**: Crimson/Red (`bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300`)
- **Paid**: Emerald/Green (`bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300`)

---

## 3. Typography
- **Display Headlines**: `Bebas Neue` / `Oswald`, condensed all-caps with generous letter-spacing (`tracking-wide` / `tracking-wider`).
- **Body & Interface**: `Poppins` (weights 300, 400, 500, 600, 700), clean and modern geometric sans-serif.
- **Monospace & Codes**: `JetBrains Mono` / `ui-monospace` for invoice IDs (`INV-2026-0001`), transaction IDs, and registration plates.

---

## 4. Layout & Component Geometry
- **Cards**: Generous `rounded-2xl` to `rounded-3xl` (16px to 24px) corners, subtle layered shadows (`shadow-sm hover:shadow-md transition-shadow`).
- **Buttons**:
  - `variant="primary"`: Pill button (`rounded-full`), Signal Yellow background, dark text, confident bold weight.
  - `variant="outline"`: Pill button, border-2 border-teal-700 / dark:border-teal-400, hover:bg-teal-50.
  - `variant="teal"`: Pill button, Teal 900 background, white text, yellow hover border.
  - `variant="danger"`: Red badge or pill button for cancellations / deactivations.
- **Indian Vehicle Plate Component (`NumberPlate`)**:
  - White plate with blue strip on left containing the Ashoka Chakra emblem / "IND" in chrome blue.
  - Bold, spaced black registration text: `MH 12 AB 1234`.
  - Embossed border with rounded corners.
- **Hand-Drawn SVG Decorations**:
  - `YellowSquiggle`: Wavy hand-drawn underline for hero highlights and promotional tags.
  - `YellowSparkle`: 4-point star sparkle cluster for premium certification and trust badges.
  - `DottedLine`: Horizontal/vertical connector line linking sequential booking and workflow steps.

---

## 5. Screen Hierarchy & Architecture
1. **Public Landing Page** (10 sections in exact order):
   1. Sticky Nav: Logo, Links, Login outline, Book a Service yellow CTA.
   2. Hero Section: Two-tone headline, subtext, quick-start plate search card, car vector + yellow squiggle.
   3. Teal Band: 3 Core Benefits + Image Collage.
   4. How To Start: 4-step workflow on a dotted connector line.
   5. Customer Testimonials: Carousel with 5 yellow stars.
   6. Get a Quote: Teal card with phone preview mockup.
   7. Locations: Teal address card + embedded OpenStreetMap iframe.
   8. FAQ Accordion: Interactive collapsibles.
   9. Contact Form: Directly connects to `/api/contact`.
   10. Dark Footer: Deep `#0A0F0F` background, links, copyright.

2. **Authentication**:
   - Register Page: Customer registration with live input validation.
   - Login Page: Role toggle tabs (Customer, Mechanic, Admin) + quick-click Demo Account chips.

3. **Customer Dashboard**:
   - Live Active Service Card with Progress Tracker.
   - My Vehicles (interactive modal, Indian plates).
   - 5-Step Book Service Wizard (including rich Problem Description step with voice speech input, category chips, photos upload, urgency safety banner).
   - My Bookings & Timeline.
   - Itemized Invoices with download and Mock Payment Gateway (UPI, Card, NetBanking).

4. **Mechanic Workspace**:
   - Role-isolated jobs (only own assigned jobs).
   - Status transitions with legal state constraints.
   - Live parts stock deduction and labour logging.
   - Mark Completed trigger to automatically generate itemized customer invoice.

5. **Admin Operations**:
   - KPI metrics & Recharts graphs.
   - Pending Requests priority queue with Mechanic Assignment drawer.
   - Bookings, Customer, and Mechanic management (with active job deactivation protection).
   - Spare Parts inventory with low-stock badges.
   - Financial reports with date range filtering, charts, and CSV download.
