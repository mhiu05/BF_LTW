import mongoose from "mongoose";

const SchemaInfoSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    __v: Number,
    load_date_time: String,
  },
  { collection: "schemaInfo", versionKey: false }
);

export const SchemaInfo = mongoose.model("SchemaInfo", SchemaInfoSchema);
