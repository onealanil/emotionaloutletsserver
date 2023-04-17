const express = require("express");
const route = express.Router();
const postInfoModel = require("../mongoDB/PostSchema");
const authenticate = require("../middleware");
const UserInfoModel = require("../mongoDB/UserInfo");
const NotificationModel = require("../mongoDB/NotificationSchema");
const CommentModel = require("../mongoDB/CommentSchema");

//cretae post
route.post("/createpost", authenticate, async (req, res) => {
  try {
    const picture = req.body.img;
    const content = req.body.content;
    if (!picture && !content) {
      return res.status(422).json({ message: "Post can't be empty" });
    }
    const userdata = new postInfoModel({
      content,
      picture,
      postedBy: req.user._id,
    });

    await userdata.save();
    res.status(201).json({ message: "Successfully! created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create post" });
  }
});

// get all the post
route.get("/allpost", authenticate, async (req, res) => {
  try {
    const userInfo = await UserInfoModel.findOne({ _id: req.user._id }).select(
      "following"
    );
    const result = await postInfoModel
      .find({ postedBy: { $in: userInfo.following } })
      .sort({ createdAt: -1 }) // <-- Sort by creation date in descending order
      .populate("postedBy", "_id profilePic fullname gender")
      .exec();

    res.status(200).json({ result });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to get all posts" });
  }
});

//like post
route.put("/like", authenticate, (req, res) => {
  let responseSent = false;
  postInfoModel
    .findById(req.body.postId)
    .populate("postedBy", "_id")
    .exec()
    .then((post) => {
      if (post.likes.includes(req.user._id)) {
        // User already liked the post
        if (!responseSent) {
          responseSent = true;
          return res
            .status(200)
            .json({ message: "User already liked the post" });
        }
      }
      return postInfoModel
        .findByIdAndUpdate(
          req.body.postId,
          { $addToSet: { likes: req.user._id } },
          { new: true }
        )
        .exec();
    })
    .then((result) => {
      if (!responseSent) {
        const postOwnerId = result.postedBy.toString();
        const senderId = req.user._id.toString();
        const postId = req.body.postId;
        const notificationType = "LIKE";

        // Check if post owner and sender IDs are not the same as the logged-in user ID
        if (postOwnerId !== senderId) {
          // Create a new notification for the post owner
          const notification = new NotificationModel({
            receiver: postOwnerId,
            sender: senderId,
            post: postId,
            type: notificationType,
          });

          notification
            .save()
            .then(() => {
              // Retrieve the saved notification from the database
              return NotificationModel.findOne({ _id: notification._id })
                .populate("sender", "fullname profilePic gender")
                .populate("post", "content picture")
                .sort("-createdAt");
            })
            .then((populatedNotification) => {
              res.json({
                result,
                notification: populatedNotification,
              });
            })
            .catch((err) => {
              console.error("Error saving notification:", err);
            });
        }
      }
    })
    .catch((err) => {
      if (!responseSent) {
        return res.status(422).json({ error: err });
      }
    });
});

//unlike post
route.put("/unlike", authenticate, (req, res) => {
  postInfoModel
    .findByIdAndUpdate(
      req.body.postId,
      { $pull: { likes: req.user._id } },
      { new: true }
    )
    .exec()
    .then((result) => {
      res.json({ result });
    })
    .catch((err) => {
      return res.status(422).json({ error: err });
    });
});

//comment api-->handler
// Create a new comment
route.post("/:postId/comment", authenticate, async (req, res) => {
  try {
    const postId = req.params.postId;
    const authorId = req.user._id.toString();
    const body = req.body.comment;

    const comment = new CommentModel({
      body,
      author: authorId,
      post: postId,
    });

    const savedComment = await comment.save();

    const post = await postInfoModel
      .findById(postId)
      .populate("postedBy", "_id");
    const postOwnerId = post.postedBy._id.toString();
    const senderId = authorId;
    const post_id = postId;
    const notificationType = "COMMENT";

    // Check if post owner and sender IDs are not the same as the logged-in user ID
    if (postOwnerId !== senderId) {
      // Create a new notification for the post owner
      const notification = new NotificationModel({
        receiver: postOwnerId,
        sender: senderId,
        post: post_id,
        type: notificationType,
      });

      const savedNotification = await notification.save();
    }

    res.status(200).json({ savedComment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

route.get("/:postId/comments", async (req, res) => {
  try {
    const postId = req.params.postId;
    const comments = await CommentModel.find({ post: postId })
      .sort({ createdAt: -1 })
      .populate("author", "username profilePic gender");
    res.status(200).json({ comments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//notifcation
// Fetch notifications for a user
route.get("/notifications", authenticate, (req, res) => {
  NotificationModel.find({ receiver: req.user._id })
    .populate("sender", "fullname profilePic gender")
    .populate("post", "content picture")
    .sort("-createdAt")
    .exec()
    .then((notifications) => {
      res.json({ notifications });
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
    });
});

route.get("/notifications/count", authenticate, async (req, res) => {
  try {
    const count = await NotificationModel.countDocuments({
      receiver: req.user._id,
      isRead: false,
    });
    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = route;
