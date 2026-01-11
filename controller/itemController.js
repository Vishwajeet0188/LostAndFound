const Item = require("../models/item");


// ================= ALL ITEMS + SEARCH =================
exports.getAllItems = async (req, res) => {
  try {
    const query = req.query.search || "";
    let items;

    if (query) {
      items = await Item.find({
        $or: [
          { title: { $regex: query, $options: "i" } },
          { category: { $regex: query, $options: "i" } },
          { location: { $regex: query, $options: "i" } }
        ]
      });
    } else {
      items = await Item.find({});
    }

    res.render("pages/index", {
      items,
      user: req.user,
      query   // ✅ pass query to EJS
    });

  } catch (err) {
    console.error(err);
    res.render("pages/index", {
      items: [],
      user: req.user,
      query: ""
    });
  }
};



// ================= CREATE ITEM =================
exports.createItem = async (req, res) => {
  try {
    const item = new Item({
      ...req.body,
      owner: req.user._id,


      image: req.file ? req.file.path : null
    });

    await item.save();

    req.flash("success_msg", "Item created successfully");
    res.redirect("/items");

  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to create item");
    res.redirect("/items/create");
  }
};


// ================= SINGLE ITEM =================
// ================= SINGLE ITEM =================
exports.getElementById = async (req, res) => {
  try {
    // ADD .populate('reportedBy') to get finder's details
    const item = await Item.findById(req.params.id).populate('reportedBy', 'username name email');
    
    if (!item) {
      req.flash("error", "Item not found");
      return res.redirect("/items");
    }

    res.render("pages/details", { 
      item, 
      user: req.user || null,
      messages: {
        success: req.flash("success")[0] || null,
        error: req.flash("error")[0] || null
      }
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Error loading item");
    res.redirect("/items");
  }
};


// ================= EDIT =================
exports.editForm = async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) return res.send("Item not found");

  res.render("pages/edit", { item });
};

exports.updateItem = async (req, res) => {
  try {
    await Item.findByIdAndUpdate(req.params.id, req.body);
    res.redirect(`/items/${req.params.id}`);
  } catch (err) {
    res.send("Error updating item");
  }
};





// ================= MY ITEMS =================
exports.getMyItems = async (req, res) => {
  try {
    // 🔒 Auth check
    if (!req.isAuthenticated()) {
      req.flash("error_msg", "Please login first");
      return res.redirect("/login");
    }

    // 1️⃣ Items CREATED by user
    const myItems = await Item.find({
      owner: req.user._id
    });

    // 2️⃣ Items REPORTED by user
    const reportedItems = await Item.find({
      reportedBy: req.user._id
    }).populate("owner");

    // 🎯 Render same page with two datasets
    res.render("pages/myItems", {
      myItems,
      reportedItems
    });

  } catch (err) {
    console.error(err);
    res.send("Error loading your items");
  }
};



exports.updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }

    // update text fields
    item.title = req.body.title;
    item.description = req.body.description;
    item.category = req.body.category;
    item.location = req.body.location;
    item.reward = req.body.reward;
    item.status = req.body.status;

    // ✅ THIS IS THE KEY FIX
    if (req.file) {
      item.image = `/uploads/${req.file.filename}`;
    }

    await item.save();

    req.flash("success_msg", "Item updated successfully");
    res.redirect(`/items/${item._id}`);

  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Update failed");
    res.redirect("/items");
  }
};



// ================= DELETE ITEM =================
exports.deleteItem = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      req.flash("error_msg", "Please login first");
      return res.redirect("/login");
    }

    const item = await Item.findById(req.params.id);

    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }

    // 🔐 OWNER CHECK
    if (!item.owner.equals(req.user._id)) {
      req.flash("error_msg", "You are not allowed to delete this item");
      return res.redirect("/items");
    }

    await Item.findByIdAndDelete(req.params.id);

    req.flash("success_msg", "Item deleted successfully");
    res.redirect("/items/my-items");

  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to delete item");
    res.redirect("/items");
  }
};


// Mark item as found by someone
exports.markItemAsFound = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      req.flash("error", "Item not found");
      return res.redirect("/items");
    }
    
    // Check if user is the owner (can't find your own item)
    if (item.owner && item.owner.equals(req.user._id)) {
      req.flash("error", "You cannot mark your own item as found");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Update item as found
    item.status = "found";
    item.reportedBy = req.user._id;
    item.foundLocation = req.body.foundLocation;
    item.foundNotes = req.body.foundNotes;
    item.foundDate = new Date();
    item.isReported = true;
    
    await item.save();
    
    req.flash("success", "Item marked as found! The owner has been notified.");
    res.redirect(`/items/${req.params.id}`);
  } catch (error) {
    console.error(error);
    req.flash("error", "Something went wrong");
    res.redirect(`/items/${req.params.id}`);
  }
};

// Request reward for found item
exports.requestReward = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      req.flash("error", "Item not found");
      return res.redirect("/items");
    }
    
    // Check if user is the one who found it
    if (!item.reportedBy || !item.reportedBy.equals(req.user._id)) {
      req.flash("error", "Only the finder can request reward");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Check if there's a reward
    if (!item.reward || item.reward <= 0) {
      req.flash("error", "No reward specified for this item");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Check if reward already requested
    if (item.rewardRequested) {
      req.flash("info", "Reward already requested");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Update item with reward request
    item.rewardRequested = true;
    item.rewardRequestedAt = new Date();
    item.preferredPayment = req.body.preferredPayment;
    item.paymentDetails = req.body.paymentDetails;
    
    await item.save();
    
    req.flash("success", "Reward request submitted! The owner will review and pay.");
    res.redirect(`/items/${req.params.id}`);
  } catch (error) {
    console.error(error);
    req.flash("error", "Failed to request reward");
    res.redirect(`/items/${req.params.id}`);
  }
};

// Approve and mark reward as paid by owner
exports.approveReward = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      req.flash("error", "Item not found");
      return res.redirect("/items");
    }
    
    // Check if user is the owner
    if (!item.owner || !item.owner.equals(req.user._id)) {
      req.flash("error", "Only the owner can approve rewards");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Check if reward was requested
    if (!item.rewardRequested) {
      req.flash("error", "Reward not requested yet");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Check if already paid
    if (item.rewardPaid) {
      req.flash("info", "Reward already marked as paid");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Mark as paid
    item.rewardPaid = true;
    item.rewardPaidAt = new Date();
    item.paymentMethod = req.body.paymentMethod;
    item.transactionId = req.body.transactionId;
    item.paymentDate = req.body.paymentDate || new Date();
    
    await item.save();
    
    req.flash("success", "Reward marked as paid! Finder can confirm receipt.");
    res.redirect(`/items/${req.params.id}`);
  } catch (error) {
    console.error(error);
    req.flash("error", "Failed to approve reward");
    res.redirect(`/items/${req.params.id}`);
  }
};

// Confirm receipt of reward by finder
exports.confirmReceipt = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      req.flash("error", "Item not found");
      return res.redirect("/items");
    }
    
    // Check if user is the finder
    if (!item.reportedBy || !item.reportedBy.equals(req.user._id)) {
      req.flash("error", "Only the finder can confirm receipt");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Check if reward was paid
    if (!item.rewardPaid) {
      req.flash("error", "Reward not paid yet");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Check if already confirmed
    if (item.rewardConfirmed) {
      req.flash("info", "Receipt already confirmed");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Confirm receipt
    item.rewardConfirmed = true;
    item.rewardConfirmedAt = new Date();
    item.amountReceived = req.body.amountReceived || item.reward;
    item.receiptDate = req.body.receiptDate || new Date();
    
    await item.save();
    
    req.flash("success", "Receipt confirmed! Reward process completed.");
    res.redirect(`/items/${req.params.id}`);
  } catch (error) {
    console.error(error);
    req.flash("error", "Failed to confirm receipt");
    res.redirect(`/items/${req.params.id}`);
  }
};

// Owner marks their own item as found
exports.ownerMarkFound = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      req.flash("error", "Item not found");
      return res.redirect("/items");
    }
    
    // Check if user is the owner
    if (!item.owner || !item.owner.equals(req.user._id)) {
      req.flash("error", "Only the owner can mark their own item as found");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Update item
    item.status = "found";
    item.foundLocation = req.body.foundLocation;
    item.foundDate = new Date();
    item.isReported = true;
    
    // If there's a reward, mark it as claimed
    if (item.reward && item.reward > 0) {
      item.rewardRequested = false;
      item.rewardPaid = false;
      item.rewardConfirmed = false;
    }
    
    await item.save();
    
    req.flash("success", "Item marked as found!");
    res.redirect(`/items/${req.params.id}`);
  } catch (error) {
    console.error(error);
    req.flash("error", "Failed to mark item as found");
    res.redirect(`/items/${req.params.id}`);
  }
};