import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    first_name: String,
    last_name: String,
    location: String,
    description: String,
    occupation: String,
    login_name: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  { collection: "users", versionKey: false }
);

export const User = mongoose.model("User", UserSchema);
