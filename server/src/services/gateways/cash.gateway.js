// Cash paid at the StudyLoom office. There is no gateway to call and nothing to redirect to:
// the payment is recorded as "pending" and staff confirm it once the money is actually in the
// drawer (billing.controller -> confirmCashPayment). Nothing here ever marks a payment paid.
const ApiError = require("../../utils/apiError");

const isConfigured = () => true; // no credentials needed

async function initiate() {
  return { gatewayOrderId: null, redirect: null };
}

async function verify() {
  return { paid: false, terminal: false, status: "awaiting_cash" };
}

// Only ever reached if someone opens the cash callback by hand.
function getLookup(payload) {
  if (!/^[a-f\d]{24}$/i.test(String(payload?.paymentId || ""))) {
    throw new ApiError(400, "Missing cash payment reference");
  }
  return { _id: payload.paymentId };
}

module.exports = { id: "cash", label: "Cash", offline: true, isConfigured, initiate, verify, getLookup };