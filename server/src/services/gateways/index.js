// Every gateway exposes the same shape:
//   id, label, isConfigured()
//   initiate({ payment, course, user, urls }) -> { gatewayOrderId, redirect }
//   getLookup(payload)                         -> mongo filter that finds our Payment
//   verify(payment, payload)                   -> { paid, terminal, status, gatewayPaymentId }
// `redirect` is either { type: "url", url } or { type: "form", method, url, fields }.
// To add another gateway (PhonePe, a UPI provider, ...), write a file with this shape and list it here.
const ApiError = require("../../utils/apiError");
const esewa = require("./esewa.gateway");
const khalti = require("./khalti.gateway");
const cash = require("./cash.gateway");

const gateways = { esewa, khalti, cash };

function getGateway(id) {
  const gateway = gateways[id];
  if (!gateway) throw new ApiError(400, `Payment method "${id}" is not supported`);
  if (!gateway.isConfigured()) throw new ApiError(503, `${gateway.label} is not set up yet`);
  return gateway;
}

// Lists EVERY method (not just the configured ones) so checkout can show eSewa, Khalti and Cash
// side by side. Ones missing credentials come back configured:false and the browser disables them
// instead of silently hiding the option.
const listAvailable = () =>
  Object.values(gateways).map((g) => ({ id: g.id, label: g.label, configured: g.isConfigured() }));

module.exports = { getGateway, listAvailable };
