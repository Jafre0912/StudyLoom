// Builds the PDF receipt for ONE successful payment and streams it to the response.
// Nothing is stored on disk or uploaded: it is generated fresh on every download.
const PDFDocument = require("pdfkit");

const money = (amount, currency) => `${currency} ${Number(amount).toLocaleString("en-IN")}`;
const dateTime = (d) =>
  new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const STATUS_LABEL = { paid: "PAID IN FULL", partial: "PARTIALLY PAID", unpaid: "UNPAID" };

// paidToDate = total of successful payments up to and including this one, so an old receipt
// keeps showing the balance as it was on that day.
function streamReceipt(res, { payment, invoice, user, course, paidToDate }) {
  const currency = invoice.currency;
  const balanceAfter = Math.max(invoice.totalAmount - paidToDate, 0);
  const statusAfter = balanceAfter === 0 ? "paid" : paidToDate > 0 ? "partial" : "unpaid";

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(res);

  // Header
  doc.fontSize(24).fillColor("#2563eb").text("Study Loom", 50, 50);
  doc.fontSize(10).fillColor("#6b7280").text("Online classes", 50, 78);
  doc.fontSize(18).fillColor("#111827").text("PAYMENT RECEIPT", 50, 50, { align: "right" });
  doc.fontSize(10).fillColor("#6b7280").text(`Receipt no: ${payment.receiptNumber}`, 50, 74, { align: "right" });
  doc.text(`Date: ${dateTime(payment.paidAt)}`, 50, 88, { align: "right" });
  doc.moveTo(50, 115).lineTo(545, 115).strokeColor("#e5e7eb").stroke();

  // Student + course
  let y = 135;
  const block = (label, value, x, width = 240) => {
    doc.fontSize(9).fillColor("#6b7280").text(label.toUpperCase(), x, y, { width });
    doc.fontSize(12).fillColor("#111827").text(value, x, y + 13, { width });
  };
  block("Received from", user.name, 50);
  block("Email", user.email, 305);
  y += 50;
  block("Course", course.title, 50, 490);
  y += 50;
  block("Invoice no", invoice.invoiceNumber, 50);
  block("Payment method", `${String(payment.gateway).toUpperCase()}  ·  Ref ${payment.gatewayPaymentId || "-"}`, 305);

  // Amount box
  y += 55;
  doc.roundedRect(50, y, 495, 60, 8).fillColor("#eff6ff").fill();
  doc.fontSize(10).fillColor("#1d4ed8").text("AMOUNT PAID (THIS RECEIPT)", 66, y + 12);
  doc.fontSize(22).fillColor("#1e3a8a").text(money(payment.amount, currency), 66, y + 28);

  // Balance breakdown
  y += 85;
  const line = (label, value, bold = false) => {
    doc.fontSize(11).fillColor("#374151").font(bold ? "Helvetica-Bold" : "Helvetica").text(label, 50, y);
    doc.text(value, 300, y, { width: 245, align: "right" });
    y += 22;
  };
  line("Total course fee", money(invoice.totalAmount, currency));
  line("Total paid so far", money(paidToDate, currency));
  doc.moveTo(50, y - 4).lineTo(545, y - 4).strokeColor("#e5e7eb").stroke();
  line("Balance remaining", money(balanceAfter, currency), true);
  line("Payment status", STATUS_LABEL[statusAfter], true);

  // Footer
  doc.font("Helvetica").fontSize(9).fillColor("#9ca3af").text(
    balanceAfter > 0
      ? "You can pay the remaining balance any time from Billing on the Study Loom website."
      : "Thank you! Your course fee is fully paid.",
    50, 720, { align: "center", width: 495 }
  );
  doc.text("This is a computer-generated receipt and does not need a signature.", 50, 735, { align: "center", width: 495 });

  doc.end();
}

module.exports = { streamReceipt };
