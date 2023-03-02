const Post = require("../models/Posts");
const User = require("../models/Users");
const cloudinary = require("cloudinary");

exports.createPost = async (req, res) => {
  try {
    const myCloud = await cloudinary.v2.uploader.upload(req.body.image, {
      folder: "posts",
    });

    const newPostData = {
      caption: req.body.caption,
      image: {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      },

      owner: req.user._id,
    };

    const newPost = await Post.create(newPostData);

    const user = await User.findById(req.user._id);

    user.posts.unshift(newPost._id);

    await user.save();

    res.status(201).json({
      success: true,
      msg: "Post Uploaded SuccessFully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

exports.likeAndUnlikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: true,
        msg: "Post Not Found",
      });
    }

    if (post.likes.includes(req.user.id)) {
      const index = post.likes.indexOf(req.user.id);

      post.likes.splice(index, 1);
      await post.save();

      return res.status(200).json({
        success: true,
        msg: "Post Unliked",
      });
    }

    post.likes.push(req.user.id);
    await post.save();

    return res.status(200).json({
      success: true,
      msg: "Post Liked",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        msg: "Post Not Found",
      });
    }

    if (post.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        msg: "Unauthorized Access",
      });
    }

    await cloudinary.v2.uploader.destroy(post.image.public_id);

    await post.remove();
    const user = await User.findById(req.user._id);

    const index = user.posts.indexOf(req.params.id);
    user.posts.splice(index, 1);
    await user.save();

    res.status(200).json({
      success: true,
      msg: "Post Deleted Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

exports.getPostOfFollowint = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const post = await Post.find({
      owner: {
        $in: user.following,
      },
    }).populate("owner likes comments.user");

    res.status(200).json({
      success: true,
      post: post.reverse(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

exports.updateCaption = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        msg: "Post not found",
      });
    }

    if (req.user._id.toString() !== post.owner.toString()) {
      return res.status(400).json({
        success: false,
        msg: "UnAuthorized Access",
      });
    }

    post.caption = req.body.caption;
    await post.save();

    res.status(200).json({
      success: true,
      msg: "Caption Updated",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

exports.commentOnPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404).json({
        success: false,
        msg: "Post Not Found",
      });
    }

    let commentIndex = -1;

    post.comments.forEach((item, index) => {
      if (req.user._id.toString() === item.user.toString()) {
        commentIndex = index;
      }
    });

    if (commentIndex !== -1) {
      post.comments[commentIndex].comment = req.body.comment;

      post.save();

      res.status(200).json({
        success: true,
        msg: "Comment Updated",
      });
    } else {
      post.comments.push({
        user: req.user._id,
        comment: req.body.comment,
      });

      await post.save();

      res.status(200).json({
        success: true,
        msg: "Comment Added",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        msg: "Post Not Found",
      });
    }

    if (post.owner._id.toString() === req.user._id.toString()) {
      if (req.body.commentId === undefined) {
        return res.status(400).json({
          success: false,
          msg: "Comment Id is Required",
        });
      }

      post.comments.forEach((item, index) => {
        if (item._id.toString() === req.body.commentId.toString()) {
          return post.comments.splice(index, 1);
        }
      });

      await post.save();

      res.status(200).json({
        success: true,
        msg: "Selected Comment Deleted",
      });
    } else {
      let commentIndex = -1;

      post.comments.forEach((item, index) => {
        if (req.user._id.toString() === item.user._id.toString()) {
          return post.comments.splice(index, 1);
        }
      });

      await post.save();

      res.status(200).json({
        success: true,
        msg: "Your Comment Deleted",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};
