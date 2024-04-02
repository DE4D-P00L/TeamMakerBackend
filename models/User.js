import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  id: Number,
  first_name: String,
  last_name: String,
  email: String,
  gender: {
    type: String,
    enum: ["Male", "Female"],
  },
  avatar: String,
  domain: String,
  available: Boolean,
});

const User = mongoose.model("User", userSchema);
export default User;
