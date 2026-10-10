// Thin wrapper so the rest of the app just calls sendEmail(...) without caring
// whether Resend or SendGrid is configured. Switch providers via EMAIL_PROVIDER in .env.
const { Resend } = require("resend");

async function sendEmail({ to, subject, html }) {
  const provider = process.env.EMAIL_PROVIDER || "resend";

  if (!process.env.RESEND_API_KEY && !process.env.SENDGRID_API_KEY) {
    console.warn(`[email] No email API key set. Skipping send to ${to}: "${subject}"`);
    return { skipped: true };
  }

  if (provider === "resend") {
    const resend = new Resend(process.env.RESEND_API_KEY);
    return resend.emails.send({
      from: process.env.EMAIL_FROM || "no-reply@eduplatform.com",
      to,
      subject,
      html,
    });
  }

  // SendGrid path - kept dependency-free here; install @sendgrid/mail if you pick this provider.
  console.warn("[email] SendGrid provider selected but not wired up yet. Add @sendgrid/mail.");
  return { skipped: true };
}

function verificationEmailTemplate(name, verifyUrl) {
  return `<div style="font-family:sans-serif">
    <h2>Welcome to EduPlatform, ${name}!</h2>
    <p>Please verify your email by clicking the link below:</p>
    <a href="${verifyUrl}">Verify my email</a>
  </div>`;
}

function receiptEmailTemplate(name, courseTitle, amount, currency) {
  return `<div style="font-family:sans-serif">
    <h2>Payment received</h2>
    <p>Hi ${name}, thanks for enrolling in <strong>${courseTitle}</strong>.</p>
    <p>Amount charged: ${amount} ${currency}</p>
  </div>`;
}

module.exports = { sendEmail, verificationEmailTemplate, receiptEmailTemplate };
