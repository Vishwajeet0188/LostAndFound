const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },

        aiDescription: String,
        aiCategory: String,
        aiKeywords: [String],

        category: {
            type: String,
            required: true
        },
        location: {
            type: String,
            required: true
        },
        reward: {
            type: Number,
            default: 0
        },
        image: String,
        contactName: String,
        contactPhone: String,
        contactEmail: String,

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        finder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        status: {
            type: String,
            enum: ["lost", "found", "returned", "reward_pending", "reward_paid"],
            default: "lost"
        },

        isReported: {
            type: Boolean,
            default: false
        },
        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        // ========= REWARD WORKFLOW FIELDS =========
        
        // Step 1: Finder claims reward
        rewardClaimed: { 
            type: Boolean, 
            default: false 
        },
        rewardClaimedAt: Date,
        
        // Step 2: Payment details from finder
        paymentMethod: {
            type: String,
            enum: ["cash", "upi", "bank", "other", null],
            default: null
        },
        paymentDetails: {
            // Store as JSON string or use nested object
            upiId: String,
            bankName: String,
            accountNumber: String,
            accountHolderName: String,
            ifscCode: String,
            otherDetails: String
        },
        
        // Step 3: Owner approves/rejects
        rewardStatus: {
            type: String,
            enum: ["not_claimed", "claimed", "approved", "rejected", "paid", "confirmed", "disputed"],
            default: "not_claimed"
        },
        rewardApprovedAt: Date,
        rewardRejectedAt: Date,
        rejectionReason: String,
        
        // Step 4: Owner marks as paid
        rewardPaid: { 
            type: Boolean, 
            default: false 
        },
        rewardPaidAt: Date,
        transactionId: String,
        paymentProof: String, // URL to payment screenshot/receipt
        
        // Step 5: Finder confirms receipt
        rewardConfirmed: { 
            type: Boolean, 
            default: false 
        },
        rewardConfirmedAt: Date,
        confirmationCode: String, // For verification
        confirmationExpires: Date,
        
        // Step 6: Additional tracking
        amountReceived: {
            type: Number,
            default: 0
        },
        receiptDate: Date,
        
        // Found details
        foundLocation: String,
        foundNotes: String,
        foundDate: Date,
        
        // Return verification
        returnedVerified: {
            type: Boolean,
            default: false
        },
        returnVerificationDate: Date,
        
        // Dispute handling
        disputeRaised: {
            type: Boolean,
            default: false
        },
        disputeReason: String,
        disputeRaisedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        disputeResolved: {
            type: Boolean,
            default: false
        },
        
        // ========= ADD THESE FIELDS =========
        ownerConfirmed: {
            type: Boolean,
            default: false
        },
        
        // For EJS template compatibility - virtual fields
        rewardRequested: {
            type: Boolean,
            default: false,
            get: function() {
                return this.rewardStatus === 'claimed';
            }
        },
        
        // Settlement status
        settled: {
            type: Boolean,
            default: false
        },
        settledAt: Date
    },
    { 
        timestamps: true,
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

// Virtual for EJS template
itemSchema.virtual('isSettled').get(function() {
    return this.settled || (this.status === 'returned' && this.rewardStatus === 'confirmed');
});

// Add index for better query performance
itemSchema.index({ status: 1, rewardStatus: 1 });
itemSchema.index({ owner: 1, status: 1 });
itemSchema.index({ finder: 1 });

module.exports = mongoose.model("Item", itemSchema);