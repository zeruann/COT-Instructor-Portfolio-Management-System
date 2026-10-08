require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Instructor = require("./models/Instructor");

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const hashedPassword = await bcrypt.hash("password123", 10);

  const existing = await Instructor.findOne({ email: "test@buksu.edu.ph" });
  if (existing) {
    console.log("Test instructor already exists.");
  } else {
    await Instructor.create({
      fullName: "Test Instructor",
      email: "test@buksu.edu.ph",
      password: hashedPassword,
    });
    console.log("Test instructor created: test@buksu.edu.ph / password123");
  }

  mongoose.disconnect();
}

seed();