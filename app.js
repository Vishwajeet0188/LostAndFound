require("dotenv").config();

const express = require("express");
const app = express();
const ejsMate = require("ejs-mate");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo"); 
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require('bcryptjs');

const Item = require("./models/item");
const User = require("./models/user");          
const authRoutes = require("./route/authRoutes"); 
const itemRoutes = require("./route/itemRoute");

const rewardRoutes = require("./route/rewards");
const paymentRoutes = require("./route/payments");

const profileRoutes = require("./route/profile");
const adminRoutes = require("./route/admin");

// VIEW ENGINE
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// STATIC FILES 
app.use(express.static(path.join(__dirname, "public")));

// BODY PARSER 
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// FILE UPLOAAD : 

const fileUpload = require('express-fileupload');

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  createParentPath: true,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  abortOnLimit: true
}));


/* ---- SESSION CONFIGURATION FOR connect-mongo@5.1.0 ---- */
const store = MongoStore.create({
  mongoUrl: process.env.ATLAS_DB,
  crypto: {
    secret: process.env.SESSION_SECRET || 'fallback-secret'
  },
  touchAfter: 24 * 3600,
  collectionName: 'sessions'
});

store.on("error", (err) => {
  console.log("SESSION STORE ERROR:", err);
});

const sessionOptions = {
  store: store,
  name: 'sessionId',
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false, // Changed to false for better security
  rolling: true, // Reset cookie maxAge on every request
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax'
  }
};
// CRITICAL: Apply session middleware
app.use(session(sessionOptions));

// FLASH - Must come AFTER session middleware
app.use(flash());

// PASSPORT - INITIALIZE
app.use(passport.initialize());
app.use(passport.session());

// PASSPORT STRATEGY 
passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        return done(null, false, { message: "No account found. Please register first." });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: "Incorrect password." });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// SERIALIZE
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// DESERIALIZE
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// SINGLE GLOBAL VARIABLES MIDDLEWARE (COMBINED)
app.use((req, res, next) => {
  // Flash messages
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  
  // User info
  res.locals.currentUser = req.user;
  res.locals.user = req.user || null;
  
  // For template convenience
  res.locals.isAuthenticated = req.isAuthenticated ? req.isAuthenticated() : false;
  
  next();
});

// METHOD OVERRIDE 
const methodOverride = require("method-override");
app.use(methodOverride("_method"));

// DATABASE - Must come AFTER session setup
const connectDB = require("./config/db");
connectDB();

// Debug route to check session
app.get("/debug-session", (req, res) => {
  res.json({
    sessionId: req.sessionID,
    session: req.session,
    user: req.user,
    isAuthenticated: req.isAuthenticated(),
    sessionStore: req.sessionStore ? 'Configured' : 'Not configured'
  });
});

// ROUTES
app.use("/", authRoutes);
app.use("/items", itemRoutes);
app.use("/profile", profileRoutes);
app.use("/rewards", rewardRoutes);
app.use("/payments", paymentRoutes);
app.use("/admin", adminRoutes);

// HOME 
app.get("/", async (req, res) => {
  try {
    const items = await Item.find({});
    res.render("pages/index", {
      items,
      user: req.user,
      query: ""
    });
  } catch (err) {
    console.error(err);
    res.render("pages/index", {
      items: [],
      user: req.user,
      query: ""
    });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render("pages/404", { user: req.user });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  res.status(500).render("pages/500", { 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
    user: req.user 
  });
});

 
// SERVER 
app.listen(8080, () => {
  console.log("Server running on port 8080");
});

