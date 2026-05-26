import mongoose from "mongoose";

const CommentUserSchema = new mongoose.Schema(
  {
    _id: String,
    first_name: String,
    last_name: String,
  },
  { _id: false }
);

const CommentSchema = new mongoose.Schema(
  {
    _id: String,
    date_time: String,
    comment: String,
    user: CommentUserSchema,
    photo_id: String,
  },
  { _id: false }
);

const PhotoSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    date_time: String,
    file_name: String,
    user_id: String,
    comments: [CommentSchema],
  },
  { collection: "photos", versionKey: false }
);

export const Photo = mongoose.model("Photo", PhotoSchema);
