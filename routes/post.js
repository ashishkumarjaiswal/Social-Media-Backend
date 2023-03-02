const express = require("express");
const {
  createPost,
  likeAndUnlikePost,
  deletePost,
  getPostOfFollowint,
  updateCaption,
  commentOnPost,
  deleteComment,
} = require("../controllers/post");
const { isAuthenticated } = require("../middlewares/auth");

const router = express.Router();

router.post("/upload", isAuthenticated, createPost);

router.get("/upload/:id", isAuthenticated, likeAndUnlikePost);

router.delete("/upload/:id", isAuthenticated, deletePost);

router.put("/upload/:id", isAuthenticated, updateCaption);

router.get("/posts", isAuthenticated, getPostOfFollowint);

router.put("/post/comment/:id", isAuthenticated, commentOnPost);

router.delete("/post/comment/:id", isAuthenticated, deleteComment);

module.exports = router;
