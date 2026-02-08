// middleware/auth.js - Authentication Middleware
module.exports = {
  isLoggedIn: (req, res, next) => {
    // Method 1: Check passport's isAuthenticated method
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    
    // Method 2: Check req.user directly
    if (req.user) {
      return next();
    }
    
    // Method 3: Check session
    if (req.session && req.session.passport && req.session.passport.user) {
      return next();
    }
    
    // If all checks fail, user is not authenticated
    req.flash("error_msg", "Please login to continue");
    res.redirect("/login");
  }
};