const express = require("express");
const router = express.Router();
const {
  getCheckoutSummary,
  startPayment,
  verifyPayment,
  listMyInvoices,
  downloadReceipt,
  adminListInvoices,
  confirmCashPayment,
  checkPromo,
  listMyPayments,
  listPendingCash,
  rejectCashPayment,
  //confirmCashPayment,
} = require("../controllers/billing.controller");
const { protect } = require("../middleware/auth.middleware");
const { restrictTo } = require("../middleware/role.middleware");

// Student
router.get("/checkout/:courseId", protect, getCheckoutSummary);
router.post("/promo", protect, checkPromo);
router.get("/payments", protect, listMyPayments);
router.post("/pay", protect, startPayment);
router.post("/verify", protect, verifyPayment);
router.get("/invoices", protect, listMyInvoices);
router.get("/receipts/:paymentId", protect, downloadReceipt); // admins can fetch any receipt too

// Admin / instructor
router.get("/admin/invoices", protect, restrictTo("admin", "instructor"), adminListInvoices);
router.patch("/admin/payments/:id/confirm", protect, restrictTo("admin"), confirmCashPayment);

router.get("/admin/cash-pending", protect, restrictTo("admin", "instructor"), listPendingCash);
router.post("/admin/payments/:paymentId/confirm", protect, restrictTo("admin", "instructor"), confirmCashPayment);
router.post("/admin/payments/:paymentId/reject", protect, restrictTo("admin", "instructor"), rejectCashPayment);

module.exports = router;
