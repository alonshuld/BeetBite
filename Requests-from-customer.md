# Customer Requirements

## White Theme

Apply light/white UI theme to the entire application.

---

## Subcontractor Payment

- Payment must be assigned to a project.
- No payment status field — subcontractor payments are always considered paid (no pending state).
- Date defaults to current date; date is editable by the user.
- Show an error if the payment would cause total subcontractor payments to exceed the subcontractor's agreed contract amount (overpay guard).

---

## Project Report

- User selects a client first; project list is filtered to that client.
- User then selects a project from the filtered list.
- Subcontractor field pre-selects the subcontractor who was used for this project last month.
- Project completion % field pre-fills with last month's completion value for this project.
- Date defaults to current date.
- Payments in the report are grouped/separated by date (e.g., 3 payments in same month each shown separately with their date).
- Toggle to switch between standard view and spreadsheet-style table UI.
- Allow user to reassign a corporation payment to a different project by searching/selecting project by name.
- Show total sum of subcontractor payments per client for the selected month.
- Profit margin simulator: user selects a client, sees all that client's projects, and can adjust a margin % to preview how it affects all project sums — simulation only, nothing is saved.
- Dates in the report show month + year only (no day).

---

## Income Per Month Screen (new screen)

- Shows all projects grouped by month.
- For each project: display income amount, income status (pending / paid), and project completion % (payments received ÷ total project value).

---

## Corporation Payment

- Add a description field.
- Make the entry expandable (accordion/collapsible UI).
- Make the entry editable.
- Add a "future" boolean flag. Future = not yet invoiced.
- If the payment is NOT future: show a VAT percentage field, selectable from the UI, defaulting to 18%.

---

## Project

- Display project completion percentage, calculated as: payments received ÷ total project value.
- Allow overpayment and underpayment — no hard enforcement on payment totals.
- Add a "Done" toggle to mark a project as closed.
- Default view shows only active/open projects.
- Three independent toggle filters (any combination allowed):
  - **Active** — on by default; shows current open projects.
  - **Future** — shows projects with no project report yet.
  - **Closed** — shows projects the user has marked as done.
