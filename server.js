const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth'); // Import auth routes
const dotenv = require('dotenv');
dotenv.config();


const app = express();

// CORS Configuration
const allowedOrigins = [
    'https://prismatic-lamington-297b85.netlify.app', // Add your Netlify frontend URL here
    'http://localhost:3001', // Add your local development frontend
  ];
  
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, Postman)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true, // Allow cookies and other credentials
    })
  );
  
app.use(express.json()); // Parse JSON payloads

// Mount auth routes
app.use('/auth', authRoutes);

// Default route
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// MongoDB connection
mongoose
    .connect('mongodb+srv://iashu-777:fatherhadadonkey@cluster0.xm1o9.mongodb.net/chess_db?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
      console.error('Error connecting to MongoDB:', err);
      process.exit(1); // Stop server if DB connection fails
  });
    

  const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});