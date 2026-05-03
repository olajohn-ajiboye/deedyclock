
# Salon Hourly Tracking System

An iPad-optimized time tracker for salon workers. Workers tap their tile, pick a customer, tap Start, tap End — hours auto-calculate and roll up by week. All data stored locally in the browser to start.

## Screens

### 1. Worker Grid (Home)
- Large tappable tiles showing each worker's name and avatar/initials.
- Live indicator on tiles where the worker currently has an active session ("On the clock — Jane • 32 min").
- Top-right: links to **Customers**, **Workers**, and **Weekly Report**.

### 2. Worker Detail / Clock screen
After tapping a worker tile:
- Header: worker name, today's total hours, current week total.
- **Active session card** (if running): customer name, live elapsed timer, big red **End** button.
- **Start a session**: large customer picker (searchable grid of customer tiles) → tap customer → confirm → session starts immediately with current timestamp.
- **Today's sessions** list below: each row shows customer, start–end, duration, edit icon.

### 3. Edit Session
Tap any session (active or completed) to edit:
- Change start time (time picker, iPad-friendly wheel).
- Change end time (or mark still active).
- Change customer.
- Delete session (with confirm).
- Validation: end must be after start; warn on overlapping sessions for same worker.

### 4. Customers (management)
- List/grid of customers with add, edit, delete, search.
- Fields: name, optional phone/note, color tag for quick recognition.
- Soft-delete: deleting a customer keeps historical sessions intact (shown as "[name] (archived)").

### 5. Workers (management)
- Same pattern as customers: add, edit, delete.
- Fields: name, color/avatar initials, optional hourly rate (display only for now).

### 6. Weekly Report
- Week selector (prev/next, jump to current). Week starts Monday by default.
- **Per-worker section** (one card per worker):
  - Total hours for the week, daily mini-bar (Mon–Sun).
  - **Per-customer breakdown**: table of customers worked on with hours and session count.
  - Expandable list of all individual sessions for that week with edit access.
- Top of page: salon-wide totals (total hours, total sessions, top customer).
- Export button: download week as CSV.

## UX details for iPad

- Min tap target 64px; primary actions 80px+ height.
- Single-column layouts on portrait, two-column where useful in landscape.
- No hover-only affordances; all actions reachable by tap.
- Time pickers use native-feeling wheel/segmented inputs, not tiny date dropdowns.
- High-contrast Start (green) and End (red) buttons; running timer pulses subtly.
- Confirmation sheets slide from bottom (drawer) rather than centered modals to stay thumb-reachable.
- Persistent header showing "On the clock" workers so a manager glance reveals salon state.

## Data model (local, in `localStorage`)

```text
workers:    { id, name, color, hourlyRate?, archived }
customers:  { id, name, phone?, note?, color, archived }
sessions:   { id, workerId, customerId, startAt, endAt | null, createdAt, updatedAt }
settings:   { weekStartsOn: 1 (Mon) }
```

Hours derived: `(endAt - startAt) / 3600000`. Active session: `endAt === null`.
Weekly grouping: bucket by ISO week of `startAt`.

## Technical notes

- React + Vite + Tailwind + shadcn/ui (already installed).
- Routes: `/` (worker grid), `/worker/:id`, `/customers`, `/workers`, `/report`.
- State: a small `useTimeTracker` hook backed by `localStorage` with a Zustand-like context, or React Query with a localStorage adapter — we'll use a simple context + `useSyncExternalStore` to keep tiles live across tabs.
- date-fns for week math and formatting.
- Live timer uses a single 1s interval at the app root, broadcasting via context to avoid per-component intervals.
- CSV export built client-side (no deps).
- All data local now; structured so a future swap to Lovable Cloud (Supabase) is a drop-in repository change.

## Out of scope (for v1)

- Authentication, PINs, multi-device sync.
- Payroll / pay calculations beyond optional rate field.
- Appointments / scheduling.
