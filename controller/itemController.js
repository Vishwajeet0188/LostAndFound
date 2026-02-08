const Item = require("../models/item");
const User = require("../models/user");
const { generateAIData } = require("./aiHelper"); // Make sure aiHelper.js exists

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
          { location: { $regex: query, $options: "i" } },
          { "aiKeywords": { $regex: query, $options: "i" } } // Also search AI keywords
        ]
      });
    } else {
      items = await Item.find({});
    }

    res.render("pages/index", {
      items,
      user: req.user,
      query
    });

  } catch (err) {
    console.error("Error getting items:", err);
    req.flash("error_msg", "Error loading items");
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
    let aiData = { 
      description: "", 
      category: "", 
      keywords: [] 
    };
    
    // Try AI processing if description exists
    if (req.body.description || req.body.title) {
      try {
        const textForAI = req.body.description || req.body.title;
        aiData = await generateAIData(textForAI);
      } catch (aiErr) {
        console.error("AI processing failed:", aiErr);
        // Continue without AI data
      }
    }

    const newItem = new Item({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      location: req.body.location,
      reward: req.body.reward || 0,
      status: req.body.status || "lost",
      owner: req.user._id,
      
      // AI-generated fields
      aiDescription: aiData.description,
      aiCategory: aiData.category,
      aiKeywords: aiData.keywords,

      // Handle image upload
      image: req.file ? req.file.path : req.body.imageUrl || null
    });

    await newItem.save();

    req.flash("success_msg", "Item created successfully");
    res.redirect("/items");

  } catch (err) {
    console.error("Error creating item:", err);
    req.flash("error_msg", "Failed to create item: " + err.message);
    res.redirect("/items/create");
  }
};

// ================= SINGLE ITEM =================
exports.getElementById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('reportedBy', 'name email');
    
    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }

    res.render("pages/details", { 
      item, 
      user: req.user || null
    });
  } catch (err) {
    console.error("Error getting item:", err);
    req.flash("error_msg", "Error loading item");
    res.redirect("/items");
  }
};

// ================= EDIT FORM =================
exports.editForm = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }

    // Check ownership
    if (!item.owner.equals(req.user._id)) {
      req.flash("error_msg", "You can only edit your own items");
      return res.redirect(`/items/${req.params.id}`);
    }

    res.render("pages/edit", { 
      item,
      user: req.user 
    });
  } catch (err) {
    console.error("Error loading edit form:", err);
    req.flash("error_msg", "Error loading edit form");
    res.redirect("/items");
  }
};

// ================= UPDATE ITEM =================
exports.updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }

    // Check ownership
    if (!item.owner.equals(req.user._id)) {
      req.flash("error_msg", "You can only update your own items");
      return res.redirect(`/items/${req.params.id}`);
    }

    // Update fields
    item.title = req.body.title || item.title;
    item.description = req.body.description || item.description;
    item.category = req.body.category || item.category;
    item.location = req.body.location || item.location;
    item.reward = req.body.reward || item.reward;
    item.status = req.body.status || item.status;

    // Update image if new file uploaded
    if (req.file) {
      item.image = req.file.path;
    }

    await item.save();

    req.flash("success_msg", "Item updated successfully");
    res.redirect(`/items/${item._id}`);

  } catch (err) {
    console.error("Error updating item:", err);
    req.flash("error_msg", "Failed to update item");
    res.redirect(`/items/${req.params.id}/edit`);
  }
};

// ================= MY ITEMS =================
exports.getMyItems = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      req.flash("error_msg", "Please login first");
      return res.redirect("/login");
    }

    // Items created by user
    const myItems = await Item.find({
      owner: req.user._id
    });

    // Items reported by user
    const reportedItems = await Item.find({
      reportedBy: req.user._id
    }).populate("owner", "name email");

    res.render("pages/myItems", {
      myItems,
      reportedItems,
      user: req.user
    });

  } catch (err) {
    console.error("Error loading my items:", err);
    req.flash("error_msg", "Error loading your items");
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

    // Owner check
    if (!item.owner.equals(req.user._id)) {
      req.flash("error_msg", "You can only delete your own items");
      return res.redirect("/items");
    }

    await Item.findByIdAndDelete(req.params.id);

    req.flash("success_msg", "Item deleted successfully");
    res.redirect("/items/my-items");

  } catch (err) {
    console.error("Error deleting item:", err);
    req.flash("error_msg", "Failed to delete item");
    res.redirect("/items");
  }
};

// ================= MARK ITEM AS FOUND =================
exports.markItemAsFound = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }
    
    // Check if user is the owner (can't find your own item)
    if (item.owner && item.owner.equals(req.user._id)) {
      req.flash("error_msg", "You cannot mark your own item as found");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Update item
    item.status = "found";
    item.reportedBy = req.user._id;
    item.foundLocation = req.body.foundLocation || "Not specified";
    item.foundNotes = req.body.foundNotes || "";
    item.foundDate = new Date();
    
    await item.save();
    
    req.flash("success_msg", "Item marked as found! The owner has been notified.");
    res.redirect(`/items/${req.params.id}`);
  } catch (error) {
    console.error("Error marking as found:", error);
    req.flash("error_msg", "Failed to mark item as found");
    res.redirect(`/items/${req.params.id}`);
  }
};

// ================= REQUEST REWARD =================
exports.requestReward = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }
    
    // Check if user is the finder
    if (!item.reportedBy || !item.reportedBy.equals(req.user._id)) {
      req.flash("error_msg", "Only the finder can request reward");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Check if there's a reward
    if (!item.reward || item.reward <= 0) {
      req.flash("error_msg", "No reward specified for this item");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Update item
    item.rewardRequested = true;
    item.rewardRequestedAt = new Date();
    item.preferredPayment = req.body.preferredPayment || "Cash";
    item.paymentDetails = req.body.paymentDetails || "";
    
    await item.save();
    
    req.flash("success_msg", "Reward request submitted!");
    res.redirect(`/items/${req.params.id}`);
  } catch (error) {
    console.error("Error requesting reward:", error);
    req.flash("error_msg", "Failed to request reward");
    res.redirect(`/items/${req.params.id}`);
  }
};

// ================= APPROVE REWARD (Owner approves reward payment) =================
exports.approveReward = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }
    
    // Check if user is the owner
    if (!item.owner || !item.owner.equals(req.user._id)) {
      req.flash("error_msg", "Only the owner can approve reward payment");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Check if reward was requested
    if (!item.rewardRequested) {
      req.flash("error_msg", "No reward request pending");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Check if already approved
    if (item.rewardStatus === "approved") {
      req.flash("error_msg", "Reward already approved");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Update item
    item.rewardStatus = "approved";
    item.rewardApprovedAt = new Date();
    item.rewardApprovedBy = req.user._id;
    
    await item.save();
    
    // Update finder's reward balance
    if (item.reportedBy) {
      await User.findByIdAndUpdate(item.reportedBy, {
        $inc: { rewardBalance: item.reward || 0 }
      });
    }
    
    req.flash("success_msg", "Reward approved! Amount has been added to finder's balance.");
    res.redirect(`/items/${req.params.id}`);
  } catch (error) {
    console.error("Error approving reward:", error);
    req.flash("error_msg", "Failed to approve reward");
    res.redirect(`/items/${req.params.id}`);
  }
};

// ================= CONFIRM RECEIPT (Finder confirms they received the item) =================
exports.confirmReceipt = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }
    
    // Check if user is the finder
    if (!item.reportedBy || !item.reportedBy.equals(req.user._id)) {
      req.flash("error_msg", "Only the finder can confirm receipt");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Check if item is found
    if (item.status !== "found") {
      req.flash("error_msg", "Item must be found first");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Update item
    item.receiptConfirmed = true;
    item.receiptConfirmedAt = new Date();
    item.status = "returned"; // Change status to returned
    
    await item.save();
    
    req.flash("success_msg", "Receipt confirmed! Item marked as returned.");
    res.redirect(`/items/${req.params.id}`);
  } catch (error) {
    console.error("Error confirming receipt:", error);
    req.flash("error_msg", "Failed to confirm receipt");
    res.redirect(`/items/${req.params.id}`);
  }
};

// ================= OWNER MARK FOUND =================
exports.ownerMarkFound = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      req.flash("error_msg", "Item not found");
      return res.redirect("/items");
    }
    
    // Check if user is the owner
    if (!item.owner || !item.owner.equals(req.user._id)) {
      req.flash("error_msg", "Only the owner can mark their own item as found");
      return res.redirect(`/items/${req.params.id}`);
    }
    
    // Update item
    item.status = "found";
    item.foundLocation = req.body.foundLocation || "Found by owner";
    item.foundDate = new Date();
    
    await item.save();
    
    req.flash("success_msg", "Item marked as found!");
    res.redirect(`/items/${req.params.id}`);
  } catch (error) {
    console.error("Error owner marking found:", error);
    req.flash("error_msg", "Failed to mark item as found");
    res.redirect(`/items/${req.params.id}`);
  }
};