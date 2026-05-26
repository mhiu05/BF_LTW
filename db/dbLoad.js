import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "./mongoose.js";
import { User } from "./userModel.js";
import { Photo } from "./photoModel.js";
import { SchemaInfo } from "./schemaInfo.js";
import models from "../modelData/models.js";

const MONGODB_URI = process.env.MONGODB_URI;

async function loadDatabase() {
  await connectDB(MONGODB_URI);

  await Promise.all([
    User.deleteMany({}),
    Photo.deleteMany({}),
    SchemaInfo.deleteMany({}),
  ]);

  // Add login_name and password to each user
  const users = models.userListModel().map((user) => ({
    ...user,
    login_name: user.first_name.toLowerCase(),
    password: "weak",
  }));

  const photos = [];
  users.forEach((user) => {
    const userPhotos = models.photoOfUserModel(user._id);
    userPhotos.forEach((photo) => photos.push(photo));
  });

  if (users.length > 0) {
    await User.insertMany(users);
  }

  if (photos.length > 0) {
    await Photo.insertMany(photos);
  }

  await SchemaInfo.create({
    _id: "schemaInfo",
    __v: 0,
    load_date_time: new Date().toISOString(),
  });

  console.log(`Database loaded successfully to ${MONGODB_URI}`);
  console.log("Users created with login_name = first_name.toLowerCase(), password = 'weak'");
  process.exit(0);
}

loadDatabase().catch((err) => {
  console.error("Unable to load database:", err);
  process.exit(1);
});
