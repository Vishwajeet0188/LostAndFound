const mongoose = require("mongoose");
const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true
  },
  upiId: {
    type: String
  },
  bankName: String,
  accountNumber: String,
  ifsc: String
}, { timestamps: true });

module.exports = mongoose.model("PaymentDetails", paymentSchema);