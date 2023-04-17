const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;


const UserInfoSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    index: {
      unique: true,
    },
  },
  fullname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    index: {
      unique: true,
    },
  },
  password: {
    type: String,
    required: true,
  },
  who: {
    type: String,
    required: true,
  },
  profilePic: {
    type: String,
    default: "",
  },
  verificationToken: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    default: "",
  },
  bio: {
    type: String,
    default: "",
  },
  isVerified: {
    type: Number,
    default: 0,
  },
  followers: [{ type: ObjectId, ref: "userInformation" }],
  following: [{ type: ObjectId, ref: "userInformation" }],
  savedPost: [{ type: ObjectId, ref: "post"}],
});

const UserInfoModel = mongoose.model("userInformation", UserInfoSchema);

module.exports = UserInfoModel;
