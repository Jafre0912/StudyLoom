
require("dotenv").config();

const required = ["MONGO_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];

function validateEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.warn(
      `[env] Warning: missing env vars: ${missing.join(", ")}. ` +
        `Copy .env.example to .env and fill these in before running in production.`
    );
  }
}

module.exports = { validateEnv };
