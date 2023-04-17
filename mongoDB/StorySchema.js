const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const storySchema = new mongoose.Schema(
  {
    img: {
      type: String,
      default: "",
    },
    postedBy: {
      type: ObjectId,
      ref: "userInformation",
    },
  },
  { timestamps: true }
);

const StoryModel = mongoose.model("story", storySchema);

module.exports = StoryModel;
