const bcrypt = require('bcryptjs');

// In-memory user storage (replace with database)
let users = [];

const authController = {
    // GET /login
    getLogin: (req, res) => {
        if (req.isAuthenticated()) {
            return res.redirect('/dashboard');
        }
        res.render('auth/login', {
            title: 'Login'
        });
    },

    // POST /login (handled by passport directly in routes)

    // GET /register
    getRegister: (req, res) => {
        if (req.isAuthenticated()) {
            return res.redirect('/dashboard');
        }
        res.render('auth/register', {
            title: 'Register'
        });
    },

    // POST /register
    postRegister: async (req, res) => {
        try {
            const { name, email, password, confirmPassword } = req.body;

            // Validation
            if (!name || !email || !password || !confirmPassword) {
                req.flash('error_msg', 'Please fill in all fields');
                return res.redirect('/register');
            }

            if (password !== confirmPassword) {
                req.flash('error_msg', 'Passwords do not match');
                return res.redirect('/register');
            }

            if (password.length < 6) {
                req.flash('error_msg', 'Password must be at least 6 characters');
                return res.redirect('/register');
            }

            // Check if user exists
            const existingUser = users.find(u => u.email === email);
            if (existingUser) {
                req.flash('error_msg', 'Email already registered');
                return res.redirect('/register');
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Create user
            const newUser = {
                id: Date.now().toString(),
                name,
                email,
                password: hashedPassword
            };

            users.push(newUser);

            req.flash('success_msg', 'Registration successful! You can now login');
            res.redirect('/login');
        } catch (error) {
            console.error('Registration error:', error);
            req.flash('error_msg', 'Server error during registration');
            res.redirect('/register');
        }
    },

    // GET /dashboard
    getDashboard: (req, res) => {
        res.render('dashboard', {
            title: 'Dashboard',
            user: req.user
        });
    },

    // GET /logout
    logout: (req, res, next) => {
        req.logout((err) => {
            if (err) {
                return next(err);
            }
            req.flash('success_msg', 'You have been logged out');
            res.redirect('/login');
        });
    },

    // GET user profile
    getProfile: (req, res) => {
        res.render('auth/profile', {
            title: 'Profile',
            user: req.user
        });
    },

    // Utility function to get all users (for debugging)
    getAllUsers: () => {
        return users;
    },

    // Utility to find user by email (for passport)
    findUserByEmail: (email) => {
        return users.find(u => u.email === email);
    },

    // Utility to find user by ID (for passport)
    findUserById: (id) => {
        return users.find(u => u.id === id);
    }
};

module.exports = authController;