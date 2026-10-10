const Setting = require("../models/Setting");
const DEFAULTS = { registrationsOpen: true, autoCertificates: true };
async function getAll() {
  const rows = await Setting.find();
  return rows.reduce((acc, r) => ({ ...acc, [r.key]: r.value }), { ...DEFAULTS });
}
async function set(key, value) {
  if (!(key in DEFAULTS)) return;
  await Setting.updateOne({ key }, { value }, { upsert: true });
}
module.exports = { getAll, set, DEFAULTS };
