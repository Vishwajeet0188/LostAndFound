const express = require("express");
const router = express.Router();
const Reward = require("../models/reward");
const Item = require("../models/item");
const { isLoggedIn } = require("../middleware/auth");

// VIEW rewards dashboard
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const rewards = await Reward.find({
      $or: [{ ownerId: req.user._id }, { finderId: req.user._id }]
    })
    .populate("itemId", "title description reward")
    .populate("finderId", "name email")
    .populate("ownerId", "name email");

    res.render("pages/rewards", { 
      rewards,
      user: req.user
    });
  } catch (error) {
    console.error("Error loading rewards:", error);
    req.flash("error_msg", "Error loading rewards");
    res.redirect("/dashboard");
  }
});

// CREATE reward (Owner creates reward for finder)
router.post("/:itemId/create", isLoggedIn, async (req, res) => {
  try {
    const item = await Item.findById(req.params.itemId);
    
    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }
    
    // Check if user is the item owner
    if (!item.owner.equals(req.user._id)) {
      req.flash("error_msg", "Only item owner can create reward");
      return res.redirect(`/items/${item._id}`);
    }
    
    // Check if item is found and has a finder
    if (!item.reportedBy) {
      req.flash("error_msg", "Item must be found before creating reward");
      return res.redirect(`/items/${item._id}`);
    }
    
    // Check if reward already exists for this item
    const existingReward = await Reward.findOne({ itemId: item._id });
    if (existingReward) {
      req.flash("error_msg", "Reward already exists for this item");
      return res.redirect(`/items/${item._id}`);
    }
    
    const rewardAmount = req.body.amount || item.reward || 0;
    
    const reward = await Reward.create({
      itemId: item._id,
      finderId: item.reportedBy,
      ownerId: item.owner,
      amount: rewardAmount,
      status: "requested"
    });
    
    req.flash("success_msg", "Reward created successfully");
    res.redirect(`/items/${item._id}`);
  } catch (error) {
    console.error("Error creating reward:", error);
    req.flash("error_msg", "Failed to create reward");
    res.redirect("/items");
  }
});

// APPROVE reward (Finder approves reward amount)
router.post("/:rewardId/approve", isLoggedIn, async (req, res) => {
  try {
    const reward = await Reward.findById(req.params.rewardId);
    
    if (!reward) {
      req.flash("error_msg", "Reward not found");
      return res.redirect("/rewards");
    }
    
    // Check if user is the finder
    if (!reward.finderId.equals(req.user._id)) {
      req.flash("error_msg", "Only the finder can approve reward");
      return res.redirect("/rewards");
    }
    
    reward.status = "approved";
    await reward.save();
    
    req.flash("success_msg", "Reward approved");
    res.redirect("/rewards");
  } catch (error) {
    console.error("Error approving reward:", error);
    req.flash("error_msg", "Failed to approve reward");
    res.redirect("/rewards");
  }
});

// MARK AS PAID (Owner marks reward as paid)
router.post("/:rewardId/paid", isLoggedIn, async (req, res) => {
  try {
    const reward = await Reward.findById(req.params.rewardId);
    
    if (!reward) {
      req.flash("error_msg", "Reward not found");
      return res.redirect("/rewards");
    }
    
    // Check if user is the owner
    if (!reward.ownerId.equals(req.user._id)) {
      req.flash("error_msg", "Only the owner can mark as paid");
      return res.redirect("/rewards");
    }
    
    // Check if reward is approved first
    if (reward.status !== "approved") {
      req.flash("error_msg", "Reward must be approved by finder first");
      return res.redirect("/rewards");
    }
    
    reward.status = "paid";
    reward.paidDate = new Date();
    await reward.save();
    
    // Also update the item status
    await Item.findByIdAndUpdate(reward.itemId, {
      rewardPaid: true,
      rewardPaidAt: new Date()
    });
    
    req.flash("success_msg", "Reward marked as paid");
    res.redirect("/rewards");
  } catch (error) {
    console.error("Error marking reward as paid:", error);
    req.flash("error_msg", "Failed to mark as paid");
    res.redirect("/rewards");
  }
});

module.exports = router;