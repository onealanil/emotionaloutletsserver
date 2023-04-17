const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const userSchema = new mongoose.Schema(
  {
    picture: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      default: "",
    },
    postedBy: {
      type: ObjectId,
      ref: "userInformation",
    },
    likes: [
      {
        type: ObjectId,
        ref: "userInformation",
      },
    ],
  },
  { timestamps: true }
);

const Postmodel = mongoose.model("post", userSchema);

module.exports = Postmodel;
