const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Item = require("../models/item");
const { isLoggedIn } = require("../middleware/auth");
const bcrypt = require("bcryptjs");
const upload = require("../middleware/upload"); // Assuming you have upload middleware

// GET Profile Page
router.get("/", isLoggedIn, async (req, res) => {
  try {
    // Get fresh user data
    const user = await User.findById(req.user._id);
    
    if (!user) {
      req.flash("error_msg", "User not found");
      return res.redirect("/login");
    }
    
    // Calculate user statistics
    const listedItems = await Item.countDocuments({ owner: user._id });
    const foundItems = await Item.countDocuments({ reportedBy: user._id });
    
    res.render("pages/profile", {
      user: user,
      listedItems: listedItems,
      foundItems: foundItems
    });
  } catch (error) {
    console.error("Profile error:", error);
    req.flash("error_msg", "Error loading profile");
    res.redirect("/dashboard");
  }
});

// UPDATE Profile
router.post("/update", isLoggedIn, async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, phone, address, bio } = req.body;
    
    await User.findByIdAndUpdate(userId, {
      name,
      phone: phone || "",
      address: address || "",
      bio: bio || ""
    });
    
    req.flash("success_msg", "Profile updated successfully!");
    res.redirect("/profile");
  } catch (error) {
    console.error("Profile update error:", error);
    req.flash("error_msg", "Failed to update profile");
    res.redirect("/profile");
  }
});

// CHANGE Password
router.post("/change-password", isLoggedIn, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Validate
    if (newPassword !== confirmPassword) {
      req.flash("error_msg", "New passwords do not match");
      return res.redirect("/profile");
    }
    
    if (newPassword.length < 6) {
      req.flash("error_msg", "Password must be at least 6 characters");
      return res.redirect("/profile");
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      req.flash("error_msg", "User not found");
      return res.redirect("/profile");
    }
    
    // Check current password
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      req.flash("error_msg", "Current password is incorrect");
      return res.redirect("/profile");
    }
    
    // Update password (model's pre-save hook will hash it)
    user.password = newPassword;
    await user.save();
    
    req.flash("success_msg", "Password changed successfully!");
    res.redirect("/profile");
  } catch (error) {
    console.error("Password change error:", error);
    req.flash("error_msg", "Failed to change password");
    res.redirect("/profile");
  }
});

// UPLOAD Profile Picture (using your existing upload middleware)
router.post("/upload-photo", isLoggedIn, upload.single("profilePicture"), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      req.flash("error_msg", "Please select an image file");
      return res.redirect("/profile");
    }
    
    // Update user with image path
    const imagePath = req.file.path; // From upload middleware
    
    await User.findByIdAndUpdate(req.user._id, {
      profilePicture: imagePath
    });
    
    req.flash("success_msg", "Profile photo updated successfully!");
    res.redirect("/profile");
    
  } catch (error) {
    console.error("Photo upload error:", error);
    req.flash("error_msg", "Failed to upload photo");
    res.redirect("/profile");
  }
});

module.exports = router;