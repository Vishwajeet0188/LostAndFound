const express = require("express");
const router = express.Router();
const Item = require("../models/item");
const { isLoggedIn } = require("../middleware/auth");
const upload = require("../middleware/upload");
const fs = require("fs");
const path = require("path");

// ================= STATIC ROUTES (MUST COME FIRST) =================

// GET /items/create - Render form to create new item (MUST BE FIRST!)
router.get("/create", isLoggedIn, (req, res) => {
  res.render("pages/create", {
    user: req.user,
    categories: ["Electronics", "Documents", "Jewelry", "Clothing", "Bags", "Keys", "Pets", "Other"]
  });
});

// GET /items - List all items
router.get("/", async (req, res) => {
  try {
    const searchQuery = req.query.search || "";
    let items;

    if (searchQuery) {
      items = await Item.find({
        $or: [
          { title: { $regex: searchQuery, $options: "i" } },
          { description: { $regex: searchQuery, $options: "i" } },
          { category: { $regex: searchQuery, $options: "i" } },
          { location: { $regex: searchQuery, $options: "i" } },
          { status: { $regex: searchQuery, $options: "i" } }
        ]
      }).populate("owner", "name email").populate("finder", "name email");
    } else {
      items = await Item.find({}).populate("owner", "name email").populate("finder", "name email");
    }

    // Filter by status if provided
    const statusFilter = req.query.status;
    if (statusFilter && statusFilter !== "all") {
      items = items.filter(item => item.status === statusFilter);
    }

    // Filter by category if provided
    const categoryFilter = req.query.category;
    if (categoryFilter && categoryFilter !== "all") {
      items = items.filter(item => item.category === categoryFilter);
    }

    // Sort items
    const sortBy = req.query.sort || "newest";
    switch (sortBy) {
      case "oldest":
        items.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case "reward-high":
        items.sort((a, b) => (b.reward || 0) - (a.reward || 0));
        break;
      case "reward-low":
        items.sort((a, b) => (a.reward || 0) - (b.reward || 0));
        break;
      case "title-asc":
        items.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title-desc":
        items.sort((a, b) => b.title.localeCompare(a.title));
        break;
      default:
        items.sort((a, b) => b.createdAt - a.createdAt);
    }

    const allItems = await Item.find({});
    const categories = [...new Set(allItems.map(item => item.category).filter(Boolean))];

    res.render("pages/index", {
      items,
      user: req.user || null,
      query: searchQuery,
      statusFilter: statusFilter || "all",
      categoryFilter: categoryFilter || "all",
      sortBy,
      categories,
      totalItems: items.length
    });

  } catch (err) {
    console.error("Error loading items:", err);
    req.flash("error_msg", "Error loading items");
    res.render("pages/index", {
      items: [],
      user: req.user || null,
      query: "",
      statusFilter: "all",
      categoryFilter: "all",
      sortBy: "newest",
      categories: [],
      totalItems: 0
    });
  }
});

// GET /items/my-items - User's items
router.get("/my-items", isLoggedIn, async (req, res) => {
  try {
    const items = await Item.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .populate("finder", "name email");

    const reportedItems = await Item.find({ finder: req.user._id }) // CHANGE: Keep as reportedItems
      .sort({ createdAt: -1 })
      .populate("owner", "name email");

    res.render("pages/myItems", {
      items,
      myItems: items,
      reportedItems, // CHANGE: Keep as reportedItems
      user: req.user,
      activeTab: req.query.tab || "lost"
    });

  } catch (err) {
    console.error("Error loading my items:", err);
    req.flash("error_msg", "Error loading your items");
    res.redirect("/items");
  }
});

// POST /items - Create new item
router.post("/", isLoggedIn, upload.single("image"), async (req, res) => {
  try {
    console.log("📸 File info:", req.file);
    console.log("📦 Form data:", req.body);
    console.log("💰 Reward from form:", req.body.reward);
    console.log("💰 Reward type:", typeof req.body.reward);
    
    // Parse reward properly
    let rewardAmount = 0;
    if (req.body.reward) {
      // Convert to number
      rewardAmount = parseFloat(req.body.reward);
      if (isNaN(rewardAmount)) {
        rewardAmount = 0;
      }
    }
    
    console.log("💰 Parsed reward amount:", rewardAmount);
    
    const newItem = new Item({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      location: req.body.location,
      reward: rewardAmount, // Use the parsed amount
      status: "lost",
      owner: req.user._id,
      contactName: req.body.contactName || req.user.name,
      contactEmail: req.body.contactEmail || req.user.email,
      contactPhone: req.body.contactPhone || "",
      image: req.file ? '/uploads/' + req.file.filename : null,
      ownerConfirmed: false
    });

    console.log("📋 Item being saved:", {
      title: newItem.title,
      reward: newItem.reward,
      rewardType: typeof newItem.reward
    });
    
    await newItem.save();
    console.log("✅ Item saved with ID:", newItem._id);
    console.log("✅ Reward saved as:", newItem.reward);
    
    req.flash("success_msg", "Item created successfully!");
    res.redirect(`/items/${newItem._id}`);

  } catch (err) {
    console.error("❌ Error creating item:", err);
    req.flash("error_msg", "Error creating item. Please try again.");
    res.redirect("/items/create");
  }
});


// ================= DYNAMIC ROUTES (MUST COME AFTER STATIC ROUTES) =================

// GET /items/:id - Item details
router.get("/:id", async (req, res) => {
  try {
    // Check if the ID is valid MongoDB ObjectId
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      req.flash("error_msg", "Invalid item ID");
      return res.redirect("/items");
    }

    const item = await Item.findById(req.params.id)
      .populate("owner", "name email")
      .populate("finder", "name email");

    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }

    const similarItems = await Item.find({
      _id: { $ne: item._id },
      category: item.category,
      status: "lost"
    })
      .limit(4)
      .sort({ createdAt: -1 });

    let canEdit = false;
    let isOwner = false;
    
    if (req.user && item.owner && item.owner._id) {
      try {
        canEdit = item.owner._id.equals(req.user._id);
        isOwner = item.owner._id.equals(req.user._id);
      } catch (err) {
        console.error("Error checking ownership:", err);
        canEdit = false;
        isOwner = false;
      }
    }

    let isFinder = false;
    if (req.user && item.finder && item.finder._id) {
      try {
        isFinder = item.finder._id.equals(req.user._id);
      } catch (err) {
        console.error("Error checking finder status:", err);
        isFinder = false;
      }
    }

    // For EJS template compatibility - create virtual fields
    item.rewardRequested = item.rewardStatus === 'claimed' || item.rewardStatus === 'approved';
    
    res.render("pages/details", {
      item,
      similarItems,
      user: req.user || null,
      canEdit,
      isOwner,
      isFinder
    });

  } catch (err) {
    console.error("Error loading item details:", err);
    req.flash("error_msg", "Error loading item");
    res.redirect("/items");
  }
});

// GET /items/:id/edit - Edit item form
router.get("/:id/edit", isLoggedIn, async (req, res) => {
  try {
    // Check if the ID is valid
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      req.flash("error_msg", "Invalid item ID");
      return res.redirect("/items");
    }

    const item = await Item.findById(req.params.id);

    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }

    if (!item.owner.equals(req.user._id)) {
      req.flash("error_msg", "You can only edit your own items");
      return res.redirect(`/items/${req.params.id}`);
    }

    res.render("pages/edit", {
      item,
      user: req.user,
      categories: ["Electronics", "Documents", "Jewelry", "Clothing", "Bags", "Keys", "Pets", "Other"]
    });

  } catch (err) {
    console.error("Error loading edit form:", err);
    req.flash("error_msg", "Error loading edit form");
    res.redirect("/items");
  }
});

// PUT /items/:id - Update item
router.put("/:id", isLoggedIn, upload.single("image"), async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }

    if (!item.owner.equals(req.user._id)) {
      req.flash("error_msg", "You can only update your own items");
      return res.redirect(`/items/${req.params.id}`);
    }

    item.title = req.body.title;
    item.description = req.body.description;
    item.category = req.body.category;
    item.location = req.body.location;
    item.reward = req.body.reward || 0;
    item.contactName = req.body.contactName;
    item.contactEmail = req.body.contactEmail;
    item.contactPhone = req.body.contactPhone;
    
    if (req.file) {
      item.image = '/uploads/' + req.file.filename;
    }

    await item.save();
    req.flash("success_msg", "Item updated successfully!");
    res.redirect(`/items/${item._id}`);

  } catch (err) {
    console.error("Error updating item:", err);
    req.flash("error_msg", err.message || "Error updating item");
    res.redirect(`/items/${req.params.id}/edit`);
  }
});

// POST /items/:id/delete - Delete item
router.post("/:id/delete", isLoggedIn, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }

    if (!item.owner.equals(req.user._id)) {
      req.flash("error_msg", "You can only delete your own items");
      return res.redirect(`/items/${req.params.id}`);
    }

    await Item.findByIdAndDelete(req.params.id);
    req.flash("success_msg", "Item deleted successfully!");
    res.redirect("/items/my-items");

  } catch (err) {
    console.error("Error deleting item:", err);
    req.flash("error_msg", "Error deleting item");
    res.redirect(`/items/${req.params.id}`);
  }
});

// ================= MARK AS FOUND (For non-owner) =================
// KEEP YOUR ORIGINAL MARK-FOUND ROUTE - REMOVE THE DUPLICATE ONE
router.post("/:id/mark-found", isLoggedIn, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }

    if (item.status === "found") {
      req.flash("error_msg", "Item is already marked as found");
      return res.redirect(`/items/${item._id}`);
    }

    if (item.owner && item.owner.equals(req.user._id)) {
      req.flash("error_msg", "You cannot mark your own item as found");
      return res.redirect(`/items/${item._id}`);
    }

    // Update item
    item.status = "found";
    item.finder = req.user._id;
    item.foundLocation = req.body.foundLocation;
    item.foundNotes = req.body.foundNotes;
    item.foundDate = new Date();
    item.ownerConfirmed = false; // Owner hasn't confirmed receipt yet

    await item.save();

    req.flash("success_msg", "Item marked as found! Wait for owner to confirm receipt.");
    res.redirect(`/items/${item._id}`);

  } catch (err) {
    console.error("Error marking item as found:", err);
    req.flash("error_msg", "Error marking item as found");
    res.redirect(`/items/${req.params.id}`);
  }
});

// ================= OWNER MARKS ITEM AS FOUND (Owner found it themselves) =================
router.post("/:id/owner-mark-found", isLoggedIn, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }

    // Check if user is the owner
    if (!item.owner.equals(req.user._id)) {
      req.flash("error_msg", "Only the owner can mark their own item as found");
      return res.redirect(`/items/${item._id}`);
    }

    // Update item
    item.status = "found";
    item.foundLocation = req.body.foundLocation;
    item.foundNotes = req.body.foundNotes;
    item.foundDate = new Date();
    // Owner found it themselves, so automatically confirm receipt
    item.ownerConfirmed = true;

    await item.save();

    req.flash("success_msg", "Item marked as found by owner!");
    res.redirect(`/items/${item._id}`);

  } catch (err) {
    console.error("Error marking item as found by owner:", err);
    req.flash("error_msg", "Error marking item as found");
    res.redirect(`/items/${req.params.id}`);
  }
});

// ================= OWNER CONFIRMS RECEIPT =================
router.post("/:id/confirm-receipt", isLoggedIn, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }

    // Check if user is the owner
    if (!item.owner.equals(req.user._id)) {
      req.flash("error_msg", "Only the owner can confirm receipt");
      return res.redirect(`/items/${item._id}`);
    }

    // Check if item is found
    if (item.status !== "found") {
      req.flash("error_msg", "Item must be found before confirming receipt");
      return res.redirect(`/items/${item._id}`);
    }

    // Check if already confirmed
    if (item.ownerConfirmed) {
      req.flash("error_msg", "Receipt already confirmed");
      return res.redirect(`/items/${item._id}`);
    }

    // Update item
    item.ownerConfirmed = true;
    item.receiptDate = new Date();

    await item.save();

    req.flash("success_msg", "Receipt confirmed! Finder can now claim reward.");
    res.redirect(`/items/${item._id}`);

  } catch (err) {
    console.error("Error confirming receipt:", err);
    req.flash("error_msg", "Error confirming receipt");
    res.redirect(`/items/${req.params.id}`);
  }
});

// ================= FINDER CLAIMS REWARD =================
router.post("/:id/claim-reward", isLoggedIn, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }

    // Check if user is the finder
    if (!item.finder || !item.finder.equals(req.user._id)) {
      req.flash("error_msg", "Only the finder can claim reward");
      return res.redirect(`/items/${item._id}`);
    }

    // Check if owner confirmed receipt
    if (!item.ownerConfirmed) {
      req.flash("error_msg", "Owner must confirm receipt before claiming reward");
      return res.redirect(`/items/${item._id}`);
    }

    // Check if already claimed
    if (item.rewardClaimed) {
      req.flash("error_msg", "Reward already claimed");
      return res.redirect(`/items/${item._id}`);
    }

    const { paymentMethod, upiId, bankName, accountNumber, accountHolderName, ifscCode, otherDetails } = req.body;

    // Update item
    item.rewardClaimed = true;
    item.rewardClaimedAt = new Date();
    item.rewardStatus = "claimed";
    item.paymentMethod = paymentMethod;
    
    // Set payment details based on method
    if (paymentMethod === "upi") {
      item.paymentDetails = { upiId: upiId };
    } else if (paymentMethod === "bank") {
      item.paymentDetails = {
        bankName: bankName,
        accountNumber: accountNumber,
        accountHolderName: accountHolderName,
        ifscCode: ifscCode
      };
    } else {
      item.paymentDetails = { otherDetails: otherDetails };
    }

    await item.save();

    req.flash("success_msg", "Reward claimed! Owner will process payment.");
    res.redirect(`/items/${item._id}`);

  } catch (err) {
    console.error("Error claiming reward:", err);
    req.flash("error_msg", "Error claiming reward");
    res.redirect(`/items/${req.params.id}`);
  }
});

// ================= OWNER PAYS REWARD =================
router.post("/:id/pay-reward", isLoggedIn, upload.single("paymentProof"), async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }

    // Check if user is the owner
    if (!item.owner.equals(req.user._id)) {
      req.flash("error_msg", "Only the owner can pay reward");
      return res.redirect(`/items/${item._id}`);
    }

    // Check if reward was claimed
    if (!item.rewardClaimed || item.rewardStatus !== "claimed") {
      req.flash("error_msg", "Reward must be claimed before payment");
      return res.redirect(`/items/${item._id}`);
    }

    const { transactionId } = req.body;

    // Update item
    item.rewardStatus = "paid";
    item.rewardPaid = true;
    item.rewardPaidAt = new Date();
    item.transactionId = transactionId;
    
    // Save payment proof if uploaded
    if (req.file) {
      item.paymentProof = '/uploads/' + req.file.filename;
    }

    // Generate confirmation code
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();
    item.confirmationCode = confirmationCode;
    item.confirmationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await item.save();

    req.flash("success_msg", `Payment marked as sent! Confirmation code: ${confirmationCode}`);
    res.redirect(`/items/${item._id}`);

  } catch (err) {
    console.error("Error paying reward:", err);
    req.flash("error_msg", "Error recording payment");
    res.redirect(`/items/${req.params.id}`);
  }
});

// ================= FINDER CONFIRMS REWARD RECEIPT =================
router.post("/:id/confirm-reward", isLoggedIn, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }

    // Check if user is the finder
    if (!item.finder || !item.finder.equals(req.user._id)) {
      req.flash("error_msg", "Only the finder can confirm reward receipt");
      return res.redirect(`/items/${item._id}`);
    }

    const { confirmationCode } = req.body;

    // Verify confirmation code
    if (item.confirmationCode !== confirmationCode) {
      req.flash("error_msg", "Invalid confirmation code");
      return res.redirect(`/items/${item._id}`);
    }

    // Check if code expired
    if (new Date() > item.confirmationExpires) {
      req.flash("error_msg", "Confirmation code expired. Please request a new one.");
      return res.redirect(`/items/${item._id}`);
    }

    // Confirm receipt
    item.rewardStatus = "confirmed";
    item.rewardConfirmed = true;
    item.rewardConfirmedAt = new Date();
    
    await item.save();

    req.flash("success_msg", "Reward receipt confirmed! Thank you.");
    res.redirect(`/items/${item._id}`);

  } catch (err) {
    console.error("Error confirming reward:", err);
    req.flash("error_msg", "Error confirming reward");
    res.redirect(`/items/${req.params.id}`);
  }
});

// ================= MARK AS SETTLED (OWNER) =================
router.post("/:id/settle", isLoggedIn, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }

    // Check if user is the owner
    if (!item.owner.equals(req.user._id)) {
      req.flash("error_msg", "Only the owner can mark as settled");
      return res.redirect(`/items/${item._id}`);
    }

    // Check if reward is confirmed
    if (item.rewardStatus !== "confirmed") {
      req.flash("error_msg", "Reward must be confirmed before settling");
      return res.redirect(`/items/${item._id}`);
    }

    // Mark as settled
    item.settled = true;
    item.settledAt = new Date();
    
    await item.save();

    req.flash("success_msg", "Item marked as settled! Transaction completed.");
    res.redirect(`/items/${item._id}`);

  } catch (err) {
    console.error("Error settling item:", err);
    req.flash("error_msg", "Error settling item");
    res.redirect(`/items/${req.params.id}`);
  }
});

// ================= CHANGE ITEM STATUS (OWNER) =================
router.post("/:id/change-status", isLoggedIn, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }

    // Check if user is the owner
    if (!item.owner.equals(req.user._id)) {
      req.flash("error_msg", "Only the owner can change status");
      return res.redirect(`/items/${item._id}`);
    }

    const { newStatus } = req.body;

    // Validate status
    if (!["lost", "found"].includes(newStatus)) {
      req.flash("error_msg", "Invalid status");
      return res.redirect(`/items/${item._id}`);
    }

    // Update status
    item.status = newStatus;
    
    // If changing to found, set found date
    if (newStatus === "found") {
      item.foundDate = new Date();
    }
    
    await item.save();

    req.flash("success_msg", `Item status changed to ${newStatus}`);
    res.redirect(`/items/${item._id}`);

  } catch (err) {
    console.error("Error changing status:", err);
    req.flash("error_msg", "Error changing status");
    res.redirect(`/items/${req.params.id}`);
  }
});

// ================= KEEP YOUR EXISTING REWARD ROUTES (for compatibility) =================

// GET /items/:id/claim-reward - Render claim reward form
router.get("/:id/claim-reward", isLoggedIn, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate("owner", "name email")
      .populate("finder", "name email");

    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }

    // Check if user is the finder
    if (!item.finder || !item.finder._id.equals(req.user._id)) {
      req.flash("error_msg", "Only the finder can claim reward");
      return res.redirect(`/items/${item._id}`);
    }

    res.render("pages/claim-reward", {
      item,
      user: req.user,
      title: "Claim Reward"
    });

  } catch (err) {
    console.error("Error loading claim reward form:", err);
    req.flash("error_msg", "Error loading claim form");
    res.redirect(`/items/${req.params.id}`);
  }
});

// ================= MANAGE REWARD (OWNER VIEW) =================
router.get("/:id/manage-reward", isLoggedIn, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate("owner", "name email")
      .populate("finder", "name email");

    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }

    // Check if user is the owner
    if (!item.owner.equals(req.user._id)) {
      req.flash("error_msg", "Only the owner can manage reward");
      return res.redirect(`/items/${item._id}`);
    }

    res.render("pages/manage-reward", {
      item,
      user: req.user,
      title: "Manage Reward"
    });

  } catch (err) {
    console.error("Error loading manage reward:", err);
    req.flash("error_msg", "Error loading reward management");
    res.redirect(`/items/${req.params.id}`);
  }
});

module.exports = router;