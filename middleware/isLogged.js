// middleware/isLogged.js
module.exports = (req, res, next) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    req.flash('error_msg', 'Please login to continue');
    return res.redirect("/login");
  }
  next();
};