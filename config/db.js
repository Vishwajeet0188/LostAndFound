// will connect mongo db here : 

const mongoose = require("mongoose");

const connectDB = async() => {
    try{
        // LOCAL MONGO 
        await mongoose.connect("mongodb://127.0.0.1:27017/lostfound");
        console.log("MongoDB Connected");
        // MONGO ATLAS : 
        // await mongoose.connect(process.env.ATLAS_DB);
        // console.log("MongoDB Connected");
    }
    catch(err){
        console.log(err);
    }
};

module.exports = connectDB;