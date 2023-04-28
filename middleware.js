const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const UserInfoModel = require("./mongoDB/UserInfo");

dotenv.config();

// middleware
const authenticate = (req, res, next) => {
  const cookies = req.headers.cookie;
  if (!cookies) {
    return res.sendStatus(401);
  }
  const token = cookies.toString().split("=")[1];
  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, info) => {
    if (err) {
      return res.sendStatus(401);
    }
    UserInfoModel.findById(info.userId)
      .then((user) => {
        if (!user) {
          return res.sendStatus(401);
        }
        req.user = user._id;
        next();
      })
      .catch((err) => {
        console.log("Error while finding user:", err);
        res.status(500).json({ message: "Server error" });
      });
  });
};

module.exports = authenticate;
