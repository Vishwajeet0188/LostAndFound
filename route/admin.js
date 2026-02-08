// routes/admin.js
const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const User = require('../models/user');
const Item = require('../models/item');

// Admin Dashboard
router.get('/dashboard', isLoggedIn, isAdmin, async (req, res) => {
  try {
    // Get statistics
    const totalUsers = await User.countDocuments();
    const totalItems = await Item.countDocuments();
    const recentItems = await Item.find().sort({ createdAt: -1 }).limit(10).populate('owner');
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(10);
    
    // Category breakdown
    const categories = await Item.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Status breakdown
    const statusStats = await Item.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Calculate total rewards - FIX: Check if result exists
    const rewardResult = await Item.aggregate([
      { $match: { reward: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$reward' } } }
    ]);
    const totalRewards = rewardResult.length > 0 ? rewardResult[0].total : 0;
    
    res.render('pages/admin', {
      stats: {
        totalUsers,
        totalItems,
        activeUsers: await User.countDocuments({ isActive: true }),
        foundItems: await Item.countDocuments({ status: 'found' }),
        lostItems: await Item.countDocuments({ status: 'lost' }),
        totalRewards
      },
      recentItems,
      recentUsers,
      categories,
      statusStats,
      currentUser: req.user
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Server Error'); // ADDED: Flash message
    res.redirect('/admin/dashboard');
  }
});

// Manage Users
router.get('/users', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.render('pages/admin-users', { 
      users,
      currentUser: req.user
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading users');
    res.redirect('/admin/dashboard');
  }
});

// Manage Items
router.get('/items', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const items = await Item.find()
      .sort({ createdAt: -1 })
      .populate('owner', 'name email')
      .populate('reportedBy', 'name email');
    
    res.render('pages/admin-items', { 
      items,
      currentUser: req.user
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading items');
    res.redirect('/admin/dashboard');
  }
});

// Toggle User Status
router.post('/users/:id/toggle', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/admin/users');
    }
    
    user.isActive = !user.isActive;
    await user.save();
    
    req.flash('success_msg', `User ${user.isActive ? 'activated' : 'deactivated'} successfully`);
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error updating user');
    res.redirect('/admin/users');
  }
});

// Delete User
router.post('/users/:id/delete', isLoggedIn, isAdmin, async (req, res) => {
  try {
    // Prevent deleting own account
    if (req.params.id.toString() === req.user._id.toString()) {
      req.flash('error_msg', 'You cannot delete your own account');
      return res.redirect('/admin/users');
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/admin/users');
    }
    
    // Check if user has items
    const userItems = await Item.countDocuments({ owner: req.params.id });
    if (userItems > 0) {
      req.flash('error_msg', 'Cannot delete user with active items. Transfer or delete items first.');
      return res.redirect('/admin/users');
    }
    
    await User.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'User deleted successfully');
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error deleting user');
    res.redirect('/admin/users');
  }
});

// Delete Item
router.post('/items/:id/delete', isLoggedIn, isAdmin, async (req, res) => {
  try {
    await Item.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Item deleted successfully');
    res.redirect('/admin/items');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error deleting item');
    res.redirect('/admin/items');
  }
});

// Make Admin
router.post('/users/:id/make-admin', isLoggedIn, isAdmin, async (req, res) => {
  try {
    // Prevent modifying own role (optional safety measure)
    if (req.params.id.toString() === req.user._id.toString()) {
      req.flash('error_msg', 'You cannot modify your own role');
      return res.redirect('/admin/users');
    }
    
    await User.findByIdAndUpdate(req.params.id, { role: 'admin' });
    req.flash('success_msg', 'User promoted to admin');
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error updating user role');
    res.redirect('/admin/users');
  }
});

// Make Regular User
router.post('/users/:id/make-user', isLoggedIn, isAdmin, async (req, res) => {
  try {
    // Prevent modifying own role
    if (req.params.id.toString() === req.user._id.toString()) {
      req.flash('error_msg', 'You cannot modify your own role');
      return res.redirect('/admin/users');
    }
    
    await User.findByIdAndUpdate(req.params.id, { role: 'user' });
    req.flash('success_msg', 'User demoted to regular user');
    res.redirect('/admin/users');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error updating user role');
    res.redirect('/admin/users');
  }
});

// View User Details
router.get('/users/:id', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/admin/users');
    }
    
    // Get user's items
    const userItems = await Item.find({ owner: req.params.id }).sort({ createdAt: -1 });
    
    res.render('pages/admin-user-details', {
      user,
      userItems,
      currentUser: req.user
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading user details');
    res.redirect('/admin/users');
  }
});

// View Item Details
router.get('/items/:id', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('reportedBy', 'name email');
    
    if (!item) {
      req.flash('error_msg', 'Item not found');
      return res.redirect('/admin/items');
    }
    
    res.render('pages/admin-item-details', {
      item,
      currentUser: req.user
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading item details');
    res.redirect('/admin/items');
  }
});

module.exports = router;