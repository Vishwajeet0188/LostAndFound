const mongoose = require("mongoose");

const connectDB = async() => {
    try{
        // ✅ CORRECT FOR MONGOOSE 6+ (Current version)
        await mongoose.connect(process.env.ATLAS_DB);
        
        console.log("✅ MongoDB Atlas Connected Successfully!");
    }
    catch(err){
        console.log("❌ MongoDB Connection Error:", err.message);
        process.exit(1);
    }
};

module.exports = connectDB;