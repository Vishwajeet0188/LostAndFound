const express = require("express");
const router = express.Router();

const Reward = require("../models/reward");
const Item = require("../models/item");
const PaymentDetails = require("../models/paymentDetails");
const isLoggedIn = require("../middleware/isLogged");

// CREATE reward (Owner)
router.post("/:itemId/create", isLoggedIn, async (req, res) => {
  const item = await Item.findById(req.params.itemId);

  await Reward.create({
    itemId: item._id,
    finderId: item.reportedBy,
    ownerId: item.owner,
    amount: req.body.amount
  });

  res.redirect("/rewards");
});

// APPROVE reward (Finder)
router.post("/:rewardId/approve", isLoggedIn, async (req, res) => {
  const reward = await Reward.findById(req.params.rewardId);

  if (!reward.finderId.equals(req.user._id))
    return res.status(403).send("Unauthorized");

  reward.status = "approved";
  await reward.save();

  res.redirect("/rewards");
});

// MARK AS PAID (Owner)
router.post("/:rewardId/paid", isLoggedIn, async (req, res) => {
  const reward = await Reward.findById(req.params.rewardId);

  if (!reward.ownerId.equals(req.user._id))
    return res.status(403).send("Unauthorized");

  reward.status = "paid";
  await reward.save();

  res.redirect("/rewards");
});

// VIEW rewards
router.get("/", isLoggedIn, async (req, res) => {
  const rewards = await Reward.find({
    $or: [{ ownerId: req.user._id }, { finderId: req.user._id }]
  }).populate("itemId");

  res.render("rewards/index", { rewards });
});

module.exports = router;
