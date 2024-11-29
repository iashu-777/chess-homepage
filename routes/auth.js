const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const User = require('../models/user'); // Import the User model


// Middleware to parse JSON request bodies
router.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Set filename with timestamp to avoid collisions
    }
});

const upload = multer({ storage: storage });

// POST request for signing up a new user
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Ensure username and email are unique
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Hash the password before saving it
        

        // Create a new user
        const newUser = new User({ username, email, password: password });

        // Save the new user to the database
        await newUser.save();

        // Generate JWT token
        const token = jwt.sign({ id: newUser._id }, 'mysecretkey123', { expiresIn: '1h' });

        // Send success response with token
        res.status(201).json({ message: 'User signed up successfully!', token });
    } catch (error) {
        console.error('Error in signup route:', error);
        res.status(500).json({ error: 'Something went wrong!' });
    }
});

// POST request for logging in a user
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find the user by username
        const user = await User.findOne({ username });
        

        if (!user) {
            console.log("hi")
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        // Debugging: Log the user object and the password entered
        console.log("User from DB:", user);
        console.log("Entered Password:", password);

        // Compare the provided password (plain text) with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);

        // Debugging: Log the result of the password comparison
        console.log("Password match result:", isMatch);

        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user._id }, 'mysecretkey123', { expiresIn: '1h' });

        // Send success response with token
        res.json({ message: 'Login successful!', token });
    } catch (error) {
        console.error('Error in login route:', error);
        res.status(500).json({ error: 'Something went wrong!' });
    }
});

// Middleware to authenticate the user by verifying the JWT token
const authenticate = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Extract token from the Authorization header
    if (!token) {
        return res.status(401).json({ error: 'No token provided, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, 'mysecretkey123');
        req.user = decoded; // Add user info to request object
        next(); // Proceed to the next middleware/route handler
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
router.get('/stats', authenticate, async (req, res) => {
    try {
      // Extract and verify the token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1]; // Format: "Bearer <token>"
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mysecretkey123'); // Use your secret key

    // Fetch user stats from the database
    const userId = decoded.id; // Assuming the token contains `id`
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

      // Construct the stats object from the user data
      const stats = {
        totalGames: user.wins + user.losses + user.draws,
        winRate: (
          (user.wins / (user.wins + user.losses + user.draws || 1)) *
          100
        ).toFixed(2) + '%',
        classical: {
          games: user.classicalGames,
          winRate: (
            (user.classicalWins / user.classicalGames || 1) *
            100
          ).toFixed(2) + '%',
        },
        blitz: {
          games: user.blitzGames,
          winRate: (
            (user.blitzWins / user.blitzGames || 1) *
            100
          ).toFixed(2) + '%',
        },
        bullet: {
          games: user.bulletGames,
          winRate: (
            (user.bulletWins / user.bulletGames || 1) *
            100
          ).toFixed(2) + '%',
        },
      };
  
      // Send stats as JSON response
      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });
  

// GET request to fetch the current user's profile
router.get('/profile', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password'); // Exclude password from response
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user:{
            username:user.username,
            email:user.email,
            rating: user.rating,
            wins: user.wins,
            losses: user.losses,
            draws: user.draws,
            milestones: [
                { id: 1, title: 'First Game', achieved: user.wins + user.losses + user.draws > 0 },
                { id: 2, title: '10 Wins', achieved: user.wins >= 10 },
            ],
            profilePicture:user.profilePicture || null

        } });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Something went wrong!' });
    }
});

// POST request to update the user's profile (username, email, profile picture)
router.post('/updateProfile', authenticate, upload.single('profilePicture'), async (req, res) => {
    try {
        const { username, email } = req.body;
        const updateData = { username, email };

        // Check if a new profile picture is uploaded
        if (req.file) {
            updateData.profilePicture = `/uploads/${req.file.filename}`; // Save file path
        }

        // Update user profile in the database
        const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Something went wrong!' });
    }
});
// POST request to log out the user
router.post('/logout', (req, res) => {
    res.json({ message: 'Successfully logged out' });
});

module.exports = router;
