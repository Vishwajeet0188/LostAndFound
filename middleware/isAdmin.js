// middleware/isAdmin.js
module.exports = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  req.flash('error_msg', 'Admin access required');
  res.redirect('/');
};