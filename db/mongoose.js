import dns from "dns";
import mongoose from "mongoose";

export async function connectDB(uri) {
  mongoose.set("strictQuery", false);
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
  await mongoose.connect(uri);
}
