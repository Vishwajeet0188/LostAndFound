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
const bcrypt = require("bcryptjs");

const methodOverride = require("method-override");
const fileUpload = require("express-fileupload");

const Item = require("./models/item");
const User = require("./models/user");

const authRoutes = require("./route/authRoutes");
const itemRoutes = require("./route/itemRoute");
const rewardRoutes = require("./route/rewards");
const paymentRoutes = require("./route/payments");
const profileRoutes = require("./route/profile");
const adminRoutes = require("./route/admin");

const connectDB = require("./config/db");

/* =========================
   TRUST PROXY (CRITICAL)
========================= */
app.set("trust proxy", 1);

/* =========================
   VIEW ENGINE
========================= */
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* =========================
   STATIC FILES
========================= */
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   BODY PARSER
========================= */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* =========================
   FILE UPLOAD
========================= */
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    createParentPath: true,
    limits: { fileSize: 2 * 1024 * 1024 },
    abortOnLimit: true
  })
);

/* =========================
   SESSION (FIXED)
========================= */
app.use(
  session({
    name: "sessionId",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.ATLAS_DB,
      touchAfter: 24 * 3600
    }),
    cookie: {
      httpOnly: true,
      secure: true,          // Render = HTTPS
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

/* =========================
   FLASH
========================= */
app.use(flash());

/* =========================
   PASSPORT
========================= */
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await User.findOne({ email });
      if (!user) return done(null, false, { message: "No account found" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return done(null, false, { message: "Incorrect password" });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => done(null, user._id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

/* =========================
   GLOBAL LOCALS
========================= */
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  res.locals.currentUser = req.user || null;
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});

/* =========================
   METHOD OVERRIDE
========================= */
app.use(methodOverride("_method"));

/* =========================
   DATABASE
========================= */
connectDB();

/* =========================
   DEBUG (KEEP TEMPORARILY)
========================= */
app.get("/debug-session", (req, res) => {
  res.json({
    sessionId: req.sessionID,
    sessionExists: !!req.session,
    user: req.user,
    isAuthenticated: req.isAuthenticated()
  });
});

/* =========================
   ROUTES
========================= */
app.use("/", authRoutes);
app.use("/items", itemRoutes);
app.use("/profile", profileRoutes);
app.use("/rewards", rewardRoutes);
app.use("/payments", paymentRoutes);
app.use("/admin", adminRoutes);

/* =========================
   HOME
========================= */
app.get("/", async (req, res) => {
  const items = await Item.find({});
  res.render("pages/index", { items });
});

/* =========================
   ERRORS
========================= */
app.use((req, res) => res.status(404).send("404 - Page Not Found"));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("500 - Server Error");
});

/* =========================
   SERVER
========================= */
app.listen(8080, () => {
  console.log("Server running on port 8080");
});
