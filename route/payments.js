const express = require("express");
const router = express.Router();
const PaymentDetails = require("../models/paymentDetails");
const isLoggedIn = require("../middleware/isLogged");

// SAVE payment info (Finder)
router.post("/save", isLoggedIn, async (req, res) => {
  try {
    const { upiId, bankName, accountNumber, ifsc } = req.body;

    // Basic validation
    if (!upiId && (!accountNumber || !ifsc)) {
      req.flash("error_msg", "Please provide either UPI ID or Bank Details");
      return res.redirect("/profile");
    }

    // If bank details provided, both account number and IFSC are required
    if (accountNumber && !ifsc) {
      req.flash("error_msg", "IFSC code is required with bank account");
      return res.redirect("/profile");
    }

    if (ifsc && !accountNumber) {
      req.flash("error_msg", "Account number is required with IFSC code");
      return res.redirect("/profile");
    }

    // Save or update payment details
    await PaymentDetails.findOneAndUpdate(
      { userId: req.user._id },
      { 
        upiId: upiId || null,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        ifsc: ifsc ? ifsc.toUpperCase() : null
      },
      { 
        upsert: true,
        new: true,
        setDefaultsOnInsert: true 
      }
    );

    req.flash("success_msg", "Payment details saved successfully");
    res.redirect("/profile");

  } catch (error) {
    console.error("Error saving payment details:", error);
    req.flash("error_msg", "Failed to save payment details");
    res.redirect("/profile");
  }
});

// GET payment info (Optional - if you want to display/edit)
router.get("/details", isLoggedIn, async (req, res) => {
  try {
    const paymentDetails = await PaymentDetails.findOne({ userId: req.user._id });
    res.json({ success: true, data: paymentDetails });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;