const express = require("express");
const router = express.Router();

const PaymentDetails = require("../models/paymentDetails");
const isLoggedIn = require("../middleware/isLogged");

// SAVE payment info (Finder)
router.post("/save", isLoggedIn, async (req, res) => {
  const { upiId, bankName, accountNumber, ifsc } = req.body;

  await PaymentDetails.findOneAndUpdate(
    { userId: req.user._id },
    { upiId, bankName, accountNumber, ifsc },
    { upsert: true }
  );

  res.redirect("/profile");
});

module.exports = router;
