const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Import the User model

// POST request for signing up a new user
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Create a new user (password will be hashed automatically by the pre-save hook)
        const newUser = new User({ username, email, password });
        
        // Save the new user to the database
        await newUser.save();

        // Send success response
        res.status(201).json({ message: 'User signed up successfully!' });
    } catch (error) {
        console.error('Error in signup route:', error);
        res.status(500).json({ error: 'Something went wrong!' });
    }
});

module.exports = router;
