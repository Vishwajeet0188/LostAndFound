// middleware/isAdmin.js
module.exports = (req, res, next) => {
  // Check if user exists and has admin role
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  
  // Either not logged in or not admin
  req.flash('error_msg', 'Admin access required');
  res.redirect('/');
};