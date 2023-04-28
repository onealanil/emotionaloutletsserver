const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3001;
const path = require("path");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'https://emotionaloutlets.vercel.app'
}));

app.use(express.static(path.join(__dirname, "public")));
require("./mongoDB/Connection");
const userInfo = require("./loginSignup/User");
const post = require("./posts/post");
const MessageInfo = require("./message/Message");
const adminPost = require("./admin/AdminPost");
app.use("/", userInfo);
app.use("/post", post);
app.use("/message", MessageInfo);
app.use("/admin", adminPost);
const socketIO = require("socket.io");
const authenticate = require("./middleware");
app.use(authenticate);

const http = require("http").createServer(app);

const io = socketIO(http, {
  cors: {
    origin: "https://emotionaloutlets.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
let onlineUsers = [];

const addNewUser = (userId, socketId) => {
  !onlineUsers.some((user) => user.userId === userId) &&
    onlineUsers.push({ userId, socketId });
};

const removeUser = (socketId) => {
  onlineUsers = onlineUsers.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
  return onlineUsers.find((user) => user.userId === userId);
};

// Socket Connection
io.on("connection", (socket) => {
  socket.on("addUser", (data) => {
    addNewUser(data.userId, socket.id);
    io.emit("getUsers", onlineUsers);
  });

  // for messages
  socket.on("textMessage", ({ sender, receiver, message }) => {
    const socketIdReceiver = getUser(receiver);
    if (socketIdReceiver) {
      io.to(socketIdReceiver.socketId).emit("textMessageFromBack", {
        sender,
        receiver,
        message,
      });
    }
  });

  //for notification
  socket.on("message", (notification) => {
    const receiver = getUser(notification.receiver);
    if (receiver) {
      io.to(receiver.socketId).emit("messageFromBack", notification);
    }
  });

  socket.on("disconnect", () => {
    removeUser(socket.id);
    io.emit("getUsers", onlineUsers);
  });
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

http.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
