import mongoose from "mongoose";
import { Schema } from "mongoose";

const userSchema = new Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "user" }
});

export const User = mongoose.model("User", userSchema);
