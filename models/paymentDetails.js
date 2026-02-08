const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  upiId: {
    type: String,
    trim: true
  },
  bankName: {
    type: String,
    trim: true
  },
  accountNumber: {
    type: String,
    trim: true
  },
  ifsc: {
    type: String,
    trim: true,
    uppercase: true
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model("PaymentDetails", paymentSchema);