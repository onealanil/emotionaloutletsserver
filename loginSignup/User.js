const express = require("express");
const dotenv = require("dotenv");
const route = express.Router();
const UserInfoModel = require("../mongoDB/UserInfo");
const PostInfoModel = require("../mongoDB/PostSchema");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("../mongoDB/Connection");
const nodemailer = require("nodemailer");
const authenticate = require("../middleware");
const NotificationModel = require("../mongoDB/NotificationSchema");
const StoryModel = require("../mongoDB/StorySchema");
const BASE_URL = process.env.BASE_URL;
dotenv.config();

//signup
route.post("/signup", async (req, res) => {
  try {
    const { username, fullname, email, password, who, gender } = req.body;
    const findEmail = await UserInfoModel.findOne({ email });
    const findUsername = await UserInfoModel.findOne({ username });
    if (findEmail && findEmail.isVerified === 1) {
      return res.status(422).json({ message: "Email already exists" });
    }
    if (findEmail && findEmail.isVerified === 0) {
      return res.status(422).json({
        message:
          "Your email is not verified, check your gmail and verify it, to login",
      });
    }
    if (findUsername) {
      return res.status(422).json({ message: "Username already exists" });
    }
    if (password.length <= 8) {
      return res
        .status(422)
        .json({ message: "Your password must contains at least 8 letter" });
    }
    if (username.length <= 3 || username.length >= 14) {
      return res.status(422).json({
        message:
          "Your username must contains at least 3 letter and not more than 14 letters",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = jwt.sign({ email }, process.env.SECRET_KEY, {
      expiresIn: "1h",
    });

    //send verification mail
    const verificationLink = `${BASE_URL}/emotionaloutlets/verify-email/${verificationToken}`;

    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      name: "exampl.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
      },
    });

    let mailOptions = {
      from: "khalifaanil84@gmail.com",
      to: email,
      subject: "Verify your email!",
      text: "Verify Email",
      html: `<div style="font-family: Arial, sans-serif; font-size: 16px;">
      <div>
      <span style="color: #f5190a;">
        Emotional Outlets
      </span>
    </div>
      <h2 style="color: #f5190a;">Email Verification</h2>
      <p style="margin-bottom: 20px;">Thank you ${fullname} for signing up! Please verify your email address by clicking the button below:</p>
      <a href="${verificationLink}" style="background-color: #f5190a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Verify Email</a>
      <p style="margin-top: 20px;">If the button above doesn't work, you can also verify your email by copying and pasting the following link into your browser:</p>
      <p style="margin-top: 10px;"><a href="${verificationLink}" style="color: #007bff;"> ${verificationLink} </p>
    </div>`,
    };

    transporter.sendMail(mailOptions, async function (error, info) {
      if (error) {
        console.log(error);
      } else {
        const signupUser = new UserInfoModel({
          email,
          password: hashedPassword,
          username,
          fullname,
          who,
          gender,
          verificationToken,
        });
        await signupUser.save();
        res.status(200).json({
          message: "User signed up. Check your email for verification link.",
        });
      }
    });
  } catch (err) {
    console.log(err);
  }
});

//signup-verification token
route.get("/emotionaloutlets/verify-email/:token", async (req, res) => {
  const html = `
    <html>
    <head>
      <link href="https://fonts.googleapis.com/css?family=Nunito+Sans:400,400i,700,900&display=swap" rel="stylesheet">
    </head>
      <style>
        body {
          text-align: center;
          padding: 40px 0;
          background: #EBF0F5;
        }
          h1 {
            color: #88B04B;
            font-family: "Nunito Sans", "Helvetica Neue", sans-serif;
            font-weight: 900;
            font-size: 40px;
            margin-bottom: 10px;
          }
          p {
            color: #404F5E;
            font-family: "Nunito Sans", "Helvetica Neue", sans-serif;
            font-size:20px;
            margin: 0;
          }
        i {
          color: #9ABC66;
          font-size: 100px;
          line-height: 200px;
          margin-left:-15px;
        }
        .card {
          background: white;
          padding: 60px;
          border-radius: 4px;
          box-shadow: 0 2px 3px #C8D0D8;
          display: inline-block;
          margin: 0 auto;
        }
      </style>
      <body>
        <div class="card">
        <div style="border-radius:200px; height:200px; width:200px; background: #F8FAF5; margin:0 auto;">
          <i class="checkmark">✓</i>
        </div>
          <h1>SuccessFully verified</h1> 
          <p>Now you can login<br/><a href="http://localhost:3000/login"> Go to login page</a></p>
        </div>
      </body>
  </html>
  `;
  const { token } = req.params;

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    const user = await UserInfoModel.findOneAndUpdate(
      { email: decoded.email, verificationToken: token },
      { isVerified: 1, $unset: { verificationToken: 1 } }
    );

    if (user) {
      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } else {
      res.status(400).send("Invalid verification token.");
    }
  } catch (error) {
    console.log(error);
    res.status(400).send("Invalid verification token.");
  }
});

//login -- user
route.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  const findEmail = await UserInfoModel.findOne({ email });
  if (!findEmail || findEmail == null) {
    res.status(422).json({ message: "Email not found" });
  } else {
    if (findEmail.isVerified === 1) {
      const decryptPass = await bcrypt.compare(password, findEmail.password);
      if (decryptPass) {
        jwt.sign(
          { userId: findEmail._id },
          process.env.SECRET_KEY,
          { expiresIn: 86400 },
          (err, token) => {
            if (err) {
              return res.status(404).json({ message: "You must login first" });
            }
            res.cookie(String(findEmail._id), token, {
              path: "/",
              expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
              httpOnly: true,
              sameSite: "lax",
            });
            res.status(200).json({ message: "Successfully, logged in" });
          }
        );
      } else {
        res.status(422).json({ message: "Email or Password doesn't match" });
      }
    } else {
      res.status(422).json({ message: "Your email is not verified!" });
    }
  }
});

// edit profile
route.put("/editprofile", authenticate, async (req, res) => {
  try {
    const id = req.user._id;
    const bio = req.body.bio;
    const fullname = req.body.fullname;
    const img = req.body.img;

    if (bio === "" || fullname === "" || img === "") {
      res.status(404).send("fullname or bio or image can't be null");
    } else {
      await UserInfoModel.findByIdAndUpdate(
        { _id: id },
        { bio: bio, fullname: fullname, profilePic: img }
      );

      res.status(200).send("Updated successfully");
    }
  } catch (err) {
    res.status(404).send("Something went wrong when updating your data");
  }
});

// logout
route.post("/logout", (req, res) => {
  const cookies = req.headers.cookie;
  const token = cookies.split("=")[1];
  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      return res.sendStatus(401);
    }
    res.clearCookie(`${user.userId}`);
    req.cookies[`${user.id}`] = "";
    return res.status(200).json({ message: "successfully logged out" });
  });
});

//protocted route
route.get("/emotionaloutlets/verify", authenticate, (req, res) => {
  res.send(req.user);
});

// //get user
route.get("/user", authenticate, async (req, res) => {
  const userId = req.user;
  try {
    const user = await UserInfoModel.findById(userId, "-password")
      .populate("followers", "_id profilePic fullname gender")
      .populate("following", "_id profilePic fullname gender")
      .exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const posts = await PostInfoModel.find({ postedBy: userId })
      .populate("postedBy", "_id profilePic fullname gender")
      .exec();
    res.status(200).json({ user, posts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

//send suggested user
route.get("/suggesteduser", authenticate, async (req, res) => {
  try {
    const userInfo = await UserInfoModel.findOne({ _id: req.user._id }).select(
      "followers following"
    );
    const users = await UserInfoModel.find({
      _id: {
        $ne: req.user._id,
        $nin: userInfo.followers.concat(userInfo.following),
      },
    }).select("-savedPost -password -isVerified -email");
    res.status(200).json(users);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// follow
route.put("/follow", authenticate, async (req, res) => {
  let responseSent = false;
  try {
    const otherUserId = req.body.otherId.toString();
    const currentUserId = req.user._id.toString();
    const notificationType = "FOLLOW";

    const otherUser = await UserInfoModel.findById(otherUserId).select(
      "-savedPost -password -isVerified -email"
    );
    const currentUser = await UserInfoModel.findById(currentUserId).select(
      "-savedPost -password -isVerified -email"
    );

    if (!otherUser || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      otherUser.followers.includes(currentUserId) ||
      currentUser.following.includes(otherUserId)
    ) {
      return res.status(422).json({ message: "Already following this user" });
    }

    // Add current user to other user's followers array, but only if they're not already in the array
    if (!otherUser.followers.includes(currentUserId)) {
      await UserInfoModel.findByIdAndUpdate(
        otherUserId,
        { $addToSet: { followers: currentUserId } },
        { new: true }
      );
    }

    // Add other user to current user's following array, but only if they're not already in the array
    if (!currentUser.following.includes(otherUserId)) {
      await UserInfoModel.findByIdAndUpdate(
        currentUserId,
        { $addToSet: { following: otherUserId } },
        { new: true }
      );
    }

    if (!responseSent) {
      responseSent = true;
      res.json({ otherUser, currentUser });

      // Check if other user and current user IDs are not the same
      if (otherUserId !== currentUserId) {
        // Create a new notification for the other user
        const notification = new NotificationModel({
          receiver: otherUserId,
          sender: currentUserId,
          type: notificationType,
        });

        await notification.save();
      }
    }
  } catch (err) {
    if (!responseSent) {
      console.log(err);
      res.status(500).json({ message: "Server error" });
    }
  }
});

// unfollow
route.put("/unfollow", authenticate, async (req, res) => {
  try {
    const otherUser = await UserInfoModel.findByIdAndUpdate(
      req.body.otherId,
      {
        $pull: { followers: req.user._id },
      },
      { new: true }
    ).select("-savedPost -password -isVerified -email");
    const currentUser = await UserInfoModel.findByIdAndUpdate(
      req.user._id,
      { $pull: { following: req.body.otherId } },
      { new: true }
    ).select("-savedPost -password -isVerified -email");
    res.json({ otherUser, currentUser });
  } catch (err) {
    console.log(err);
    res.status(422).json({ message: err.message });
  }
});

// follow back
route.put("/followback", authenticate, async (req, res) => {
  let responseSent = false;
  try {
    const otherUserId = req.body.otherId.toString();
    const currentUserId = req.user._id.toString();
    const notificationType = "FOLLOW";

    const otherUser = await UserInfoModel.findById(otherUserId).select(
      "-savedPost -password -isVerified -email"
    );
    const currentUser = await UserInfoModel.findById(currentUserId).select(
      "-savedPost -password -isVerified -email"
    );

    if (!otherUser || !currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      currentUser.following.includes(otherUserId) ||
      otherUser.followers.includes(currentUserId)
    ) {
      return res.status(422).json({ message: "Already following this user" });
    }

    // Add current user to other user's followers array, but only if they're not already in the array
    if (!otherUser.followers.includes(currentUserId)) {
      await UserInfoModel.findByIdAndUpdate(
        otherUserId,
        { $addToSet: { followers: currentUserId } },
        { new: true }
      );
    }

    // Add other user to current user's following array, but only if they're not already in the array
    if (!currentUser.following.includes(otherUserId)) {
      await UserInfoModel.findByIdAndUpdate(
        currentUserId,
        { $addToSet: { following: otherUserId } },
        { new: true }
      );
    }

    if (!responseSent) {
      responseSent = true;
      res.json({ otherUser, currentUser });

      // Check if other user and current user IDs are not the same
      if (otherUserId !== currentUserId) {
        // Create a new notification for the other user
        const notification = new NotificationModel({
          receiver: otherUserId,
          sender: currentUserId,
          type: notificationType,
        });

        await notification.save();
      }
    }
  } catch (err) {
    if (!responseSent) {
      console.log(err);
      res.status(500).json({ message: "Server error" });
    }
  }
});

/// other user profile
route.get("/user/:id", async (req, res) => {
  try {
    const user = await UserInfoModel.findOne({ _id: req.params.id }).select(
      "-savedPost -password -isVerified -email"
    );
    const post = await PostInfoModel.find({ postedBy: req.params.id })
      .populate("postedBy", "_id profilePic fullname gender")
      .exec();
    res.status(200).json({ user, post });
  } catch (err) {
    res.status(422).json({ message: err.message });
  }
});

route.get("/getalluser", authenticate, async (req, res) => {
  try {
    const currentUser = req.user._id;
    const allUser = await UserInfoModel.find({
      _id: { $ne: currentUser },
    }).exec();
    console.log(allUser);
    res.status(200).json({ users: allUser });
  } catch (err) {
    res.status(422).json({ message: err.message });
  }
});

route.put("/savepost", authenticate, async (req, res) => {
  try {
    const postId = req.body.postId;
    const myId = req.user._id;

    const currentUser = await UserInfoModel.findById(myId).select(
      "-password -isVerified -email"
    );

    if (currentUser.savedPost.includes(postId)) {
      res.status(422).json({ message: "This post is already saved" });
      console.log("already saved");
    }

    if (!currentUser.savedPost.includes(postId)) {
      const response = await UserInfoModel.findByIdAndUpdate(
        myId,
        { $addToSet: { savedPost: postId } },
        { new: true }
      ).select("-password -isVerified -email");
      res.status(200).json({ response });
    }
  } catch (err) {
    res.status(422).json({ message: err.message });
  }
});

//unsaved post
route.put("/unsavepost", authenticate, async (req, res) => {
  try {
    const postId = req.body.postId;
    const myId = req.user._id;

    const currentUser = await UserInfoModel.findById(myId).select(
      "-password -isVerified -email"
    );

    if (!currentUser.savedPost.includes(postId)) {
      res.status(422).json({ message: "This post is not saved" });
      console.log("post not saved");
    } else {
      const response = await UserInfoModel.findByIdAndUpdate(
        myId,
        { $pull: { savedPost: postId } },
        { new: true }
      ).select("-password -isVerified -email");
      res.status(200).json({ response });
    }
  } catch (err) {
    res.status(422).json({ message: err.message });
  }
});

//get all the saved post
route.get("/mysavedposts", authenticate, async (req, res) => {
  try {
    const myId = req.user._id;
    const currentUser = await UserInfoModel.findById(myId)
      .populate({
        path: "savedPost",
        options: { sort: { createdAt: -1 } }, // <-- Sort by creation date in descending order
        populate: {
          path: "postedBy",
          model: "userInformation",
        },
      })
      .exec();
    console.log(currentUser);
    res.status(200).json({ savedPosts: currentUser.savedPost });
  } catch (err) {
    res.status(422).json({ message: err.message });
  }
});

//check if user has already posted a story
route.get("/checkingStory", authenticate, async (req, res) => {
  try {
    const checking = await StoryModel.findOne({ postedBy: req.user._id });
    if (checking) {
      res.status(200).json({ message: "you can't" });
    } else {
      res.status(200).json({ message: "you can" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to check story" });
  }
});

//story creation
route.post("/uploadStory", authenticate, async (req, res) => {
  try {
    const myId = req.user._id;
    if (!req.body.img) {
      return res.status(422).json({ message: "Story can't be empty" });
    }
    // Check if the story with the same postedBy id is already present in the database
    const existingStory = await StoryModel.findOne({ postedBy: myId });
    if (existingStory) {
      return res.status(200).json({ message: "Story already exists" });
    }
    const storyImage = new StoryModel({
      img: req.body.img,
      postedBy: myId,
    });

    await storyImage.save();
    // Set the timer to delete the story after 24 hours
    setTimeout(async () => {
      await StoryModel.deleteOne({ _id: storyImage._id });
    }, 24 * 60 * 60 * 1000);
    res.status(201).json({ message: "Successfully! created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create post" });
  }
});

// fetch story
route.get("/fetchStory", authenticate, async (req, res) => {
  try {
    const ownData = await UserInfoModel.findOne({ _id: req.user._id });
    const followingIds = ownData.following.map((id) => id.toString());
    const stories = await StoryModel.find({
      postedBy: { $in: followingIds },
    })
      .sort({ createdAt: -1 })
      .populate("postedBy", "username fullname profilePic");
    res.json(stories);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to fetch stories" });
  }
});

// fetch own story
route.get("/fetchOwnStory", authenticate, async (req, res) => {
  try {
    const stories = await StoryModel.find({ postedBy: req.user._id });
    res.status(200).json(stories);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to fetch own stories" });
  }
});

module.exports = route;
