const mongoose = require("mongoose");

const rewardSchema = new mongoose.Schema(
    {
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Item",
            required: true
        },
        finderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ["requested", "approved", "paid"],
            default: "requested"
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Reward", rewardSchema);