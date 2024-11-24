const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

const corsOptions = {
    origin: '*', // Replace with Netlify domain in production
    methods: ['*'], // Allow specific HTTP methods
    credentials: true, // Allow credentials if required
    allowedHeaders: ["Content-Type",'Authentication'],
};
app.use(cors(corsOptions));

app.options('*', cors(corsOptions)); // Respond to preflight requests

const authRoutes = require('./routes/auth'); // Import auth routes
const dotenv = require('dotenv');
dotenv.config();



app.use(express.json()); // Parse JSON payloads

// Mount auth routes
app.use('/auth', authRoutes);

// Default route
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// MongoDB connection
const mongoURI = process.env.MONGO_URI || 'mongodb+srv://iashu-777:fatherhadadonkey@cluster0.xm1o9.mongodb.net/chess_db?retryWrites=true&w=majority&appName=Cluster0'; // Default to local DB for testing

mongoose
    .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
      console.error('Error connecting to MongoDB:', err);
      process.exit(1); // Stop server if DB connection fails
  });
    

  const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
