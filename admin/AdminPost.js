const express = require("express");
const route = express.Router();
const authenticate = require("../middleware");
const adminPostModel = require("../mongoDB/AdminPostSchema");

//cretae post
route.post("/createpost", async (req, res) => {
  try {
    const picture = req.body.picture;
    const content = req.body.content;
    const author = req.body.author;
    if (!picture && !content) {
      return res.status(422).json({ message: "Post can't be empty" });
    }
    const adminPostData = new adminPostModel({
      content,
      picture,
      author,
    });

    await adminPostData.save();
    res.status(201).json({ message: "Successfully! created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create post" });
  }
});

// get all the post
route.get("/getallpost", authenticate, async (req, res) => {
  try {
    const posts = await adminPostModel.find({}).sort({ _id: -1 }).exec();
    res.status(200).json({ posts });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// get single post
route.get("/blognumber/:id", authenticate, async (req, res) => {
  try {
    const id = req.params.id;
    const result = await adminPostModel.findById(id).exec();
    res.status(200).json({ result });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "An error occurred while retrieving the blog post" });
  }
});

module.exports = route;
