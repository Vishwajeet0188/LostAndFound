const mongoose = require("mongoose");

const connectDB = async() => {
    try{
        // FOR LOCAL MONGO (UNCOMMENT THIS):
        // await mongoose.connect("mongodb://127.0.0.1:27017/lostfound");
        
        // FOR MONGO ATLAS (UNCOMMENT THIS):
        await mongoose.connect(process.env.ATLAS_DB);
        
        console.log("MongoDB Connected");
    }
    catch(err){
        console.log(err);
    }
};

module.exports = connectDB;