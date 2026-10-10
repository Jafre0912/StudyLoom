// eSewa ePay v2. The student is sent to eSewa with an auto-submitted POST form (signed with
// our secret), and eSewa sends them back with a base64 `data` query param that we verify
// twice: the HMAC signature, and a direct status-check call to eSewa.
const crypto = require("crypto");
const ApiError = require("../../utils/apiError");

const URLS = {
  test: {
    form: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    status: "https://rc.esewa.com.np/api/epay/transaction/status/",
  },
  live: {
    form: "https://epay.esewa.com.np/api/epay/main/v2/form",
    status: "https://epay.esewa.com.np/api/epay/transaction/status/",
  },
};

// Public sandbox credentials from eSewa's developer docs. Only used when ESEWA_ENV is not "live".
const TEST_SECRET = "8gBm/:&EnhH.1/q";

const mode = () => (process.env.ESEWA_ENV === "live" ? "live" : "test");

function config() {
  const productCode = process.env.ESEWA_PRODUCT_CODE || (mode() === "test" ? "EPAYTEST" : "");
  const secret = process.env.ESEWA_SECRET_KEY || (mode() === "test" ? TEST_SECRET : "");
  if (!productCode || !secret) {
    throw new ApiError(500, "ESEWA_PRODUCT_CODE / ESEWA_SECRET_KEY are not set in server/.env");
  }
  return { productCode, secret };
}

function isConfigured() {
  try {
    config();
    return true;
  } catch {
    return false;
  }
}

// HMAC-SHA256 (base64) over "name=value,name=value" for the listed field names, in that order.
function sign(fields, signedFieldNames, secret) {
  const message = signedFieldNames
    .split(",")
    .map((name) => `${name}=${fields[name]}`)
    .join(",");
  return crypto.createHmac("sha256", secret).update(message).digest("base64");
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// eSewa sometimes formats amounts like "1,000.0"
const toNumber = (value) => Number(String(value).replace(/,/g, ""));

function decodeData(payload) {
  if (!payload?.data) throw new ApiError(400, "Missing eSewa response data");
  try {
    return JSON.parse(Buffer.from(payload.data, "base64").toString("utf8"));
  } catch {
    throw new ApiError(400, "Invalid eSewa response data");
  }
}

// How to find our Payment record from what eSewa sends back (transaction_uuid = our payment id).
// This is only used for the lookup. Nothing in here is trusted until verify() checks the signature.
function getLookup(payload) {
  const { transaction_uuid } = decodeData(payload);
  if (!/^[a-f\d]{24}$/i.test(String(transaction_uuid))) throw new ApiError(400, "Invalid eSewa reference");
  return { _id: transaction_uuid };
}

async function initiate({ payment, urls }) {
  const { productCode, secret } = config();
  const amount = String(payment.amount); // whole rupees only, so no float formatting issues

  const fields = {
    amount,
    tax_amount: "0",
    total_amount: amount,
    transaction_uuid: String(payment._id),
    product_code: productCode,
    product_service_charge: "0",
    product_delivery_charge: "0",
    success_url: urls.success, // no query string here: eSewa appends its own "?data=..."
    failure_url: urls.failure,
    signed_field_names: "total_amount,transaction_uuid,product_code",
  };
  fields.signature = sign(fields, fields.signed_field_names, secret);

  return {
    gatewayOrderId: fields.transaction_uuid,
    redirect: { type: "form", method: "POST", url: URLS[mode()].form, fields },
  };
}

async function verify(payment, payload) {
  const { productCode, secret } = config();
  const data = decodeData(payload);

  // 1. Signature: proves the response really came from eSewa and was not edited in the URL.
  if (!data.signed_field_names || !data.signature) throw new ApiError(400, "eSewa response is not signed");
  if (!safeEqual(sign(data, data.signed_field_names, secret), data.signature)) {
    throw new ApiError(400, "eSewa signature check failed");
  }

  // 2. It must be about THIS payment and THIS merchant.
  if (data.transaction_uuid !== String(payment._id) || data.product_code !== productCode) {
    throw new ApiError(400, "eSewa response does not match this payment");
  }
  if (data.status !== "COMPLETE") {
    return { paid: false, terminal: data.status !== "PENDING", status: data.status };
  }

  // 3. Ask eSewa directly. Never trust the browser redirect alone.
  const url =
    `${URLS[mode()].status}?product_code=${encodeURIComponent(productCode)}` +
    `&total_amount=${payment.amount}&transaction_uuid=${encodeURIComponent(payment._id)}`;
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(502, "Could not confirm the payment with eSewa. Please try again.");

  const paid = body.status === "COMPLETE" && toNumber(body.total_amount) === payment.amount;
  return {
    paid,
    terminal: !paid && body.status !== "PENDING",
    status: body.status,
    gatewayPaymentId: body.ref_id || data.transaction_code,
  };
}

module.exports = { id: "esewa", label: "eSewa", isConfigured, initiate, verify, getLookup, sign };
