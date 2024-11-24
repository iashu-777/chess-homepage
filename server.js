const express = require('express');
const mongoose = require('mongoose');
const { createProxyMiddleware } = require('http-proxy-middleware');
const dotenv = require('dotenv');
const app = express();

dotenv.config();  // Make sure dotenv is loaded before anything else

// Proxy middleware setup
app.use('/api', createProxyMiddleware({
    target: 'https://chess-homepage-production.up.railway.app', // Target backend server
    changeOrigin: true, // Changes the origin of the host header to the target URL
    pathRewrite: { '^/api': '' }, // Removes '/api' from the URL
}));

// Import authentication routes
const authRoutes = require('./routes/auth');

// Middleware for parsing JSON payloads
app.use(express.json());

// Mount auth routes
app.use('/auth', authRoutes);

// Default route
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// MongoDB connection
const mongoURI = process.env.MONGO_URI || 'mongodb+srv://iashu-777:fatherhadadonkey@cluster0.xm1o9.mongodb.net/chess_db?retryWrites=true&w=majority&appName=Cluster0';

mongoose
    .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1); // Stop server if DB connection fails
    });

// Set up the server to listen on the specified port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
