require("dotenv").config();

const express = require("express");
const app = express();
const ejsMate = require("ejs-mate");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const MongoStore = require("connect-mongo");

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

const fileUpload = require('express-fileupload');

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  createParentPath: true,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  abortOnLimit: true
}));


// SESSION 
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     cookie: { maxAge: 1000 * 60 * 60 * 24 }
//   })
// );

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.ATLAS_DB,
      ttl: 24 * 60 * 60 
    }),
    cookie: { 
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: false 
    }
  })
);

// FLASH 
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
  
  // User info - IMPORTANT: Add isAuthenticated method
  res.locals.currentUser = req.user;
  res.locals.user = req.user || null;
  
  // Add isAuthenticated method to req if missing
  if (!req.isAuthenticated) {
    req.isAuthenticated = function() {
      return !!req.user;
    };
  }
  
  // Add logout method if missing
  if (!req.logout && passport.logout) {
    req.logout = passport.logout;
  }
  
  next();
});



// METHOD OVERRIDE 
const methodOverride = require("method-override");
app.use(methodOverride("_method"));

// DATABASE 
const connectDB = require("./config/db");
connectDB();

// ROUTES - REGISTER AFTER ALL MIDDLEWARE
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

// DEBUG ROUTE - Add this to test
app.get("/debug-auth", (req, res) => {
  res.json({
    reqUser: req.user,
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : "no method",
    session: req.session,
    passport: req.session?.passport,
    localsUser: res.locals.user,
    localsCurrentUser: res.locals.currentUser
  });
});

// SERVER 
app.listen(8080, () => {
  console.log("Server running on port 8080");
});