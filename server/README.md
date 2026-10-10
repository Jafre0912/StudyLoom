# StudyLoom server

Express + MongoDB API for the live-class platform.

## Run
```
npm install
npm run seed        # categories, 6 instructors, 21 courses (+ batches & every live session), learning paths, promos
npm run dev
```
Logins created by the seed: `admin@studyloom.com / Admin@123`, `instructor@studyloom.com / Instructor@123`, `student@studyloom.com / Student@123`.
`npm run seed:reset` additionally wipes old enrollments/sessions/attendance/payments.

## Payments (eSewa + Khalti)
Flow: `POST /api/billing/pay` creates an invoice + pending payment and returns a redirect (signed POST form for eSewa,
URL for Khalti) -> student pays on the gateway -> gateway returns to `CLIENT_URL/payment/callback/<gateway>` ->
client calls `POST /api/billing/verify` -> the server checks the eSewa signature + status API / Khalti lookup API,
marks the payment paid, issues a receipt number and creates the enrollment. Amounts always come from the database.

| | Sandbox (default) | Real money |
|---|---|---|
| eSewa | `ESEWA_ENV=test` (public test merchant EPAYTEST, no keys needed) | `ESEWA_ENV=live`, `ESEWA_PRODUCT_CODE`, `ESEWA_SECRET_KEY` |
| Khalti | `KHALTI_ENV=test` + your test secret key from test-admin.khalti.com | `KHALTI_ENV=live` + live secret key from admin.khalti.com |

A gateway only appears at checkout when it is configured. `CLIENT_URL` must be the public URL of the client.

## Live classes
Publishing a course creates a Morning (7:00 AM) and Evening (7:00 PM) batch and every concrete session
(weeks x classes per week). Instructors start/end a class; students join through an embedded Jitsi room
(`JITSI_DOMAIN`, default meet.jit.si). Attendance is credited server-side from join + 30 s heartbeats
(Present >= 75% of the class, Partial >= 25%). When the last session of a batch ends, students with 80%+ overall
attendance automatically get a certificate (`GET /api/certificates/verify/:certId` is public).
