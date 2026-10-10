// Khalti ePayment v2. We create a payment ("initiate"), send the student to Khalti's hosted page,
// and when they come back we confirm the result with Khalti's "lookup" API using the pidx.
const ApiError = require("../../utils/apiError");

const base = () =>
  process.env.KHALTI_ENV === "live" ? "https://khalti.com/api/v2" : "https://dev.khalti.com/api/v2";

function secretKey() {
  const key = process.env.KHALTI_SECRET_KEY;
  if (!isConfigured()) throw new ApiError(500, "KHALTI_SECRET_KEY is not set in server/.env");
  return key;
}

function isConfigured() {
  const key = (process.env.KHALTI_SECRET_KEY || "").trim();
  return Boolean(key) && !key.startsWith("your_") && !key.startsWith("<"); // placeholders do not count
}

const headers = () => ({ Authorization: `Key ${secretKey()}`, "Content-Type": "application/json" });

// Khalti sends back ?pidx=...&status=... . We look our payment up by pidx (stored when initiating).
function getLookup(payload) {
  if (!payload?.pidx) throw new ApiError(400, "Missing Khalti payment reference (pidx)");
  return { gatewayOrderId: String(payload.pidx) };
}

async function initiate({ payment, course, user, urls }) {
  const res = await fetch(`${base()}/epayment/initiate/`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      return_url: urls.success,
      website_url: process.env.CLIENT_URL || "http://localhost:5173",
      amount: payment.amount * 100, // Khalti wants paisa
      purchase_order_id: String(payment._id),
      purchase_order_name: course.title,
      customer_info: { name: user.name, email: user.email },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.pidx || !body.payment_url) {
    throw new ApiError(502, `Khalti could not start the payment: ${body.detail || body.error_key || res.status}`);
  }
  return { gatewayOrderId: body.pidx, redirect: { type: "url", url: body.payment_url } };
}

async function verify(payment, payload) {
  const res = await fetch(`${base()}/epayment/lookup/`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ pidx: payment.gatewayOrderId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(502, "Could not confirm the payment with Khalti. Please try again.");

  // Khalti statuses: Completed, Pending, Initiated, Refunded, Expired, "User canceled"
  const paid = body.status === "Completed" && Number(body.total_amount) === payment.amount * 100;
  const stillOpen = ["Pending", "Initiated"].includes(body.status);
  return { paid, terminal: !paid && !stillOpen, status: body.status, gatewayPaymentId: body.transaction_id };
}

module.exports = { id: "khalti", label: "Khalti", isConfigured, initiate, verify, getLookup };
