// middleware/auth.js - UPDATED
module.exports = {
  isLoggedIn: (req, res, next) => {
    console.log("Auth check - req.user:", req.user);
    console.log("Auth check - req.isAuthenticated:", req.isAuthenticated ? "exists" : "missing");
    
    // Method 1: If isAuthenticated method exists
    if (req.isAuthenticated && req.isAuthenticated()) {
      console.log("✅ User authenticated via isAuthenticated()");
      return next();
    }
    
    // Method 2: Check req.user directly
    if (req.user) {
      console.log("✅ User authenticated via req.user");
      return next();
    }
    
    // Method 3: Check session
    if (req.session && req.session.passport && req.session.passport.user) {
      console.log("✅ User authenticated via session");
      return next();
    }
    
    console.log("❌ User NOT authenticated");
    
    // Use correct flash key
    req.flash("error_msg", "Please login to continue");
    res.redirect("/login");
  }
};