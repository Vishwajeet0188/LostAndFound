// database schema : 

const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
    {
        title: String,
        description: String,

        aiDescription: String,
        aiCategory: String,
        aiKeywords: [String],

        category: String,
        location: String,
        reward: Number,
        image: String,   // <-- IMPORTANT for storing image filename
        contactName: String,
        contactPhone: String,
        contactEmail: String,
        createdAt: { type: Date, default: Date.now },

        owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
        },

        status: {
        type: String,
        enum: ["lost", "found"],
        required: true,
        default : "lost"
        },

        isReported: {
        type: Boolean,
        default: false
        },

        reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
        },

         // Reward tracking
        rewardRequested: 
        { type: Boolean, default: false },
        rewardRequestedAt: Date,
        preferredPayment: String,
        paymentDetails: String,
        
        rewardPaid: { type: Boolean, default: false },
        rewardPaidAt: Date,
        paymentMethod: String,
        transactionId: String,
        paymentDate: Date,
        
        rewardConfirmed: { type: Boolean, default: false },
        rewardConfirmedAt: Date,
        amountReceived: Number,
        receiptDate: Date,
        
        // Found details
        foundLocation: String,
        foundNotes: String,
        foundDate: Date,
        

    },
    { timestamps: true }
);

module.exports = mongoose.model("Item", itemSchema);
