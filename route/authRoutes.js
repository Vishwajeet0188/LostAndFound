const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const { isLoggedIn } = require("../middleware/auth");



router.get("/signup", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/dashboard");
  }
  res.redirect("/register"); 
});



/*  LOGIN PAGE */

router.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/dashboard");
  }
  res.render("pages/login", { 
    title: "Login",
    user: req.user || null  
  });
});

/* LOGIN HANDLE*/

router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      req.flash("error_msg", info?.message || "Invalid email or password");
      return res.redirect("/login");
    }

    req.logIn(user, (err) => {
      if (err) return next(err);

      req.flash("success_msg", "Logged in successfully 👋");
      const redirectTo = req.session.returnTo || "/dashboard";
      delete req.session.returnTo;
      return res.redirect(redirectTo);
    });
  })(req, res, next);
});


// REGISTER PAGE

router.get("/register", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/dashboard");
  }
  res.render("pages/signup", { 
    title: "Register",
    user: req.user || null  
  });
});

// REGISTER HANDLE


router.post("/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      req.flash("error_msg", "Please fill in all fields");
      return res.redirect("/register");
    }

    if (password !== confirmPassword) {
      req.flash("error_msg", "Passwords do not match");
      return res.redirect("/register");
    }

    if (password.length < 6) {
      req.flash("error_msg", "Password must be at least 6 characters");
      return res.redirect("/register");
    }

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash("error_msg", "Email already registered");
      return res.redirect("/register");
    }

    // Hash the password manually
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user with hashed password
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    // Auto login after registration
    req.login(user, (err) => {
      if (err) {
        console.error("AUTO LOGIN ERROR:", err);
        req.flash("success_msg", "Account created. Please login.");
        return res.redirect("/login");
      }

      req.flash("success_msg", "Welcome! Account created 🎉");
      return res.redirect("/dashboard");
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);

    if (err.code === 11000) {
      req.flash("error_msg", "Email already registered");
    } else if (err.name === "ValidationError") {
      const firstError = Object.values(err.errors)[0];
      req.flash("error_msg", firstError ? firstError.message : "Validation error");
    } else {
      req.flash("error_msg", "Registration failed. Please try again.");
    }

    return res.redirect("/register");
  }
});



// DASHBOARD

router.get("/dashboard", async (req, res) => {
  if (!req.isAuthenticated()) {
    req.flash("error_msg", "Please login first");
    return res.redirect("/login");
  }

  try {
    // Add this - Calculate user stats
    const Item = require("../models/item"); // Add this line
    
    const lostItemsCount = await Item.countDocuments({ 
      owner: req.user._id, 
      status: "lost" 
    });
    
    const foundItemsCount = await Item.countDocuments({ 
      owner: req.user._id, 
      status: "found" 
    });

    const userStats = {
      lostItems: lostItemsCount,
      foundItems: foundItemsCount,
      totalRewards: req.user.rewardBalance || 0,
      reportedItems: await Item.countDocuments({ reportedBy: req.user._id })
    };

    res.render("pages/dashboard", {
      title: "Dashboard",
      user: req.user,
      userStats // Add this line
    });

  } catch (err) {
    console.error("Error loading dashboard:", err);
    // Render dashboard without stats if there's an error
    res.render("pages/dashboard", {
      title: "Dashboard",
      user: req.user,
      userStats: null
    });
  }
});


// LOGOUT

router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash("success_msg", "Logged out successfully");
    res.redirect("/");
  });
});

//    PROFILE PAGE

router.get("/profile", isLoggedIn, async (req, res) => {
  try {
    const Item = require("../models/item"); // Import Item model
    
    // Calculate user stats
    const listedItems = await Item.countDocuments({ owner: req.user._id });
    const foundItems = await Item.countDocuments({ reportedBy: req.user._id });
    const itemsFound = await Item.countDocuments({ finder: req.user._id });
    
    const userStats = {
      listedItems,
      foundItems,
      itemsFound
    };

    res.render("pages/profile", {
      user: req.user,
      userStats // Add this
    });
  } catch (err) {
    console.error("Error loading profile:", err);
    req.flash("error_msg", "Error loading profile");
    res.redirect("/");
  }
});
module.exports = router;