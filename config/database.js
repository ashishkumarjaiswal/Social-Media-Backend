const mongoose = require("mongoose");

mongoose.set("strictQuery", false);

const connectToDataBase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to DataBase Sucessfully");
  } catch (error) {
    console.log(error);
  }
};

module.exports = connectToDataBase;
