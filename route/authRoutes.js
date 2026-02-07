const express = require("express");
const router = express.Router();
const passport = require("passport");
const bcrypt = require("bcryptjs");


// TEMP USER STORE (same reference)
const User = require("../models/user");


//  LOGIN PAGE 

router.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/dashboard");
  }
  res.render("pages/login", { title: "Login" });
});

//  LOGIN HANDLE 

router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      req.flash("error_msg", info.message || "Login failed");
      return res.redirect("/login");
    }

    req.logIn(user, err => {
      if (err) return next(err);

      // ✅ FLASH + REDIRECT TO HOME
      req.flash("success_msg", "Logged in successfully 👋");
      return res.redirect("/");
    });
  })(req, res, next);
});


//  REGISTER PAGE 

router.get("/register", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/dashboard");
  }
  res.render("pages/signup", { title: "Register" });
});

//  REGISTER HANDLE 

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

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

    // ✅ FIXED: DB CHECK
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash("error_msg", "Email already registered");
      return res.redirect("/register");
    }

    // Hash password
    // const hashedPassword = await bcrypt.hash(password, 10);

    // Save user to DB
    await User.create({
      name,
      email,
      password
    });

    req.flash("success_msg", "Account created successfully 🎉");
    res.redirect("/");

  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Server error");
    res.redirect("/register");
  }
});


//  DASHBOARD 

router.get("/dashboard", (req, res) => {
  if (!req.isAuthenticated()) {
    req.flash("error_msg", "Please login first");
    return res.redirect("/login");
  }

  res.render("pages/dashboard", {
    title: "Dashboard",
    user: req.user
  });
});

//  LOGOUT 

router.get("/logout", (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.flash("success_msg", "Logged out successfully");
    res.redirect("/");
  });
});

module.exports = router;