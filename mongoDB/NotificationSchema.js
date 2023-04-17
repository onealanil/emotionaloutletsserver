const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "userInformation",
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "userInformation",
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post",
    },
    type: String,
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const NotificationModel = mongoose.model("Notification", NotificationSchema);

module.exports = NotificationModel;
