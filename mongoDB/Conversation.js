const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const Conversation = new mongoose.Schema({
  conversation: [
    {
      type: ObjectId,
      ref: "userInformation",
    },
  ],
});

const ConversationModel = mongoose.model("conversation", Conversation);

module.exports = ConversationModel;
