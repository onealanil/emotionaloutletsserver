const mongoose = require("mongoose");


const adminPostSchema = new mongoose.Schema(
  {
    author: {
      type: String,
      default: "admin",
    },
    picture: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      default: "",
    },
  },

  { timestamps: true }
);

const adminPostModel = mongoose.model("adminpost", adminPostSchema);
module.exports = adminPostModel;
