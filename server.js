const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(function (req, res, next) {
    //Enabling CORS
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-client-key, x-client-token, x-client-secret, Authorization");
      next();
    });


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
