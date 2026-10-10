const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { uploadToCloudinary } = require("./upload.service");

async function generateCertificate({ studentName, courseTitle, issuedAt }) {
  const fileName = `certificate_${Date.now()}.pdf`;
  const tmpDir = path.join(__dirname, "..", "..", "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const filePath = path.join(tmpDir, fileName);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ layout: "landscape", size: "A4" });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(28).text("Certificate of Completion", { align: "center" });
    doc.moveDown(2);
    doc.fontSize(18).text(`This certifies that`, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(24).text(studentName, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(18).text(`has successfully completed`, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(22).text(courseTitle, { align: "center" });
    doc.moveDown(2);
    doc.fontSize(12).text(`Issued on ${issuedAt.toDateString()}`, { align: "center" });

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  const { url } = await uploadToCloudinary(filePath, "eduplatform/certificates");
  fs.unlink(filePath, () => {});
  return url;
}

module.exports = { generateCertificate };
