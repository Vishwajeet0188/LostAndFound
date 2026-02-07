const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");

/* =========================
   LOGIN PAGE
========================= */
router.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/dashboard");
  }
  res.render("pages/login", { title: "Login" });
});

/* =========================
   LOGIN HANDLE
========================= */
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      req.flash("error_msg", info?.message || "Login failed");
      return res.redirect("/login");
    }

    req.logIn(user, err => {
      if (err) return next(err);

      req.flash("success_msg", "Logged in successfully 👋");
      return res.redirect("/dashboard");
    });
  })(req, res, next);
});

/* =========================
   REGISTER PAGE
========================= */
router.get("/register", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/dashboard");
  }
  res.render("pages/signup", { title: "Register" });
});

/* =========================
   REGISTER HANDLE
========================= */
router.post("/register", async (req, res) => {
  try {
    console.log("REGISTER BODY:", req.body); // 🔍 debug (keep for now)

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

    // Create user (password hashing handled in model)
    const user = await User.create({
      name,
      email,
      password
    });

    // Auto login after registration
    req.login(user, err => {
      if (err) {
        console.error("AUTO LOGIN ERROR:", err);
        req.flash("success_msg", "Account created. Please login.");
        return res.redirect("/login");
      }

      req.flash("success_msg", "Welcome! Account created 🎉");
      return res.redirect("/dashboard");
    });

  } catch (err) {
    console.error("REGISTER ERROR FULL:", err);

    if (err.code === 11000) {
      req.flash("error_msg", "Email already registered");
    } else if (err.name === "ValidationError") {
      req.flash("error_msg", Object.values(err.errors)[0].message);
    } else {
      req.flash("error_msg", err.message || "Registration failed");
    }

    return res.redirect("/register");
  }
});

/* =========================
   DASHBOARD
========================= */
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

/* =========================
   LOGOUT
========================= */
router.get("/logout", (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.flash("success_msg", "Logged out successfully");
    res.redirect("/");
  });
});

module.exports = router;
