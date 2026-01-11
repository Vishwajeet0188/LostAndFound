// route/profile.js
const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Item = require("../models/item");
const { isLoggedIn } = require("../middleware/auth");
const bcrypt = require("bcrypt");
const cloudinary = require("../config/cloudinary");

// GET Profile Page
router.get("/", isLoggedIn, async (req, res) => {
  try {
    // Passport stores user in req.user
    const user = req.user;
    
    if (!user) {
      req.flash("error_msg", "User not found");
      return res.redirect("/login");
    }
    
    // Calculate user statistics
    const listedItems = await Item.countDocuments({ owner: user._id });
    const foundItems = await Item.countDocuments({ reportedBy: user._id });
    
    res.render("pages/profile", {
      user: user,
      userStats: {
        listedItems: listedItems,
        foundItems: foundItems
      },
      messages: {
        success: req.flash("success_msg")[0] || null,
        error: req.flash("error_msg")[0] || null
      }
    });
  } catch (error) {
    console.error(error);
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
    
    // Refresh user data in session
    const updatedUser = await User.findById(userId);
    req.login(updatedUser, (err) => {
      if (err) {
        console.error("Error refreshing session:", err);
      }
    });
    
    req.flash("success_msg", "Profile updated successfully!");
    res.redirect("/profile");
  } catch (error) {
    console.error(error);
    req.flash("error_msg", "Failed to update profile");
    res.redirect("/profile");
  }
});

// CHANGE Password
router.post("/change-password", isLoggedIn, async (req, res) => {
  try {
    const userId = req.user._id;
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
    
    const user = await User.findById(userId);
    
    if (!user) {
      req.flash("error_msg", "User not found");
      return res.redirect("/profile");
    }
    
    // Check current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      req.flash("error_msg", "Current password is incorrect");
      return res.redirect("/profile");
    }
    
    // Update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    
    req.flash("success_msg", "Password changed successfully!");
    res.redirect("/profile");
  } catch (error) {
    console.error(error);
    req.flash("error_msg", "Failed to change password");
    res.redirect("/profile");
  }
});

// UPLOAD Profile Picture
router.post("/upload-photo", isLoggedIn, async (req, res) => {
  try {
    console.log("=== UPLOAD START ===");
    console.log("req.files exists:", !!req.files);
    console.log("req.files keys:", req.files ? Object.keys(req.files) : 'none');
    
    // Check if file was uploaded
    if (!req.files || !req.files.profilePicture) {
      console.log("No file uploaded");
      req.flash("error_msg", "Please select an image file");
      return res.redirect("/profile");
    }
    
    const file = req.files.profilePicture;
    console.log("File details:", {
      name: file.name,
      size: file.size,
      mimetype: file.mimetype,
      tempFilePath: file.tempFilePath
    });
    
    // Validate file size (max 2MB)
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      req.flash("error_msg", `File size must be less than 2MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      return res.redirect("/profile");
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      req.flash("error_msg", "Only JPG, PNG, GIF, and WebP images are allowed");
      return res.redirect("/profile");
    }
    
    console.log("Uploading to Cloudinary...");
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: "lostfound/profile-photos",
      public_id: `profile_${req.user._id}_${Date.now()}`,
      overwrite: true,
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" }
      ]
    });
    
    console.log("Cloudinary upload success:", result.secure_url);
    
    // Update user with Cloudinary URL
    await User.findByIdAndUpdate(req.user._id, {
      profilePicture: result.secure_url
    });
    
    // Update current session
    const updatedUser = await User.findById(req.user._id);
    req.login(updatedUser, (err) => {
      if (err) {
        console.error("Error updating session:", err);
      }
    });
    
    req.flash("success_msg", "Profile photo updated successfully!");
    console.log("=== UPLOAD SUCCESS ===");
    res.redirect("/profile");
    
  } catch (error) {
    console.error("=== UPLOAD ERROR ===");
    console.error("Error:", error);
    
    let errorMessage = "Failed to upload photo. Please try again.";
    
    if (error.message && error.message.includes("File size")) {
      errorMessage = "File size too large. Maximum 2MB allowed.";
    } else if (error.message && error.message.includes("Invalid image")) {
      errorMessage = "Invalid image format. Please use JPG, PNG, or GIF.";
    } else if (error.http_code === 400) {
      errorMessage = "Cloudinary error: Invalid file format.";
    } else if (error.message && error.message.includes("ENOENT") || error.message && error.message.includes("no such file")) {
      errorMessage = "File upload error. Please try again.";
    }
    
    req.flash("error_msg", errorMessage);
    res.redirect("/profile");
  }
});

// Test route to check file upload
router.get("/test-upload", isLoggedIn, (req, res) => {
  res.send(`
    <h1>Test File Upload</h1>
    <form action="/profile/upload-photo" method="POST" enctype="multipart/form-data">
      <input type="file" name="profilePicture" required>
      <button type="submit">Upload Test</button>
    </form>
  `);
});

module.exports = router;