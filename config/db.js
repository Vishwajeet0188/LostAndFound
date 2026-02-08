const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("Connecting to MongoDB Atlas...");
    
    await mongoose.connect(process.env.ATLAS_DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log("✅ MongoDB Atlas Connected Successfully!");
    
    // Test the connection
    mongoose.connection.on('error', err => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err.message);
    console.error("Full error:", err);
    process.exit(1); // Exit if DB connection fails
  }
};

module.exports = connectDB;