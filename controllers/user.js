const User = require("../models/Users");
const Post = require("../models/Posts");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendEmail } = require("../middlewares/sendEmail");
const cloudinary = require("cloudinary");

exports.register = async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;

    const isAlreadyRegisterd = await User.findOne({ email });

    if (isAlreadyRegisterd) {
      return res.status(400).json({
        success: false,
        msg: "user already exist",
      });
    }

    const myCloud = await cloudinary.v2.uploader.upload(avatar, {
      folder: "avatars",
    });

    const newUser = await User.create({
      name,
      email,
      password,
      avatar: { public_id: myCloud.public_id, url: myCloud.secure_url },
    });

    const token = jwt.sign({ _id: newUser._id }, process.env.JWT_SECRET);

    res
      .status(200)
      .cookie("token", token, {
        expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        httpOnly: true,
      })
      .json({ success: true, newUser });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({ email })
      .select("+password")
      .populate("posts followers following");

    if (!user) {
      return res.status(400).json({
        success: false,
        msg: "User Not exist",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        msg: "Incorrect Password",
      });
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);

    res
      .status(200)
      .cookie("token", token, {
        expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        httpOnly: false,
      })
      .json({
        success: true,
        user,
        token,
      });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

exports.logout = (req, res) => {
  try {
    res
      .status(200)
      .cookie("token", null, { expires: new Date(Date.now()), httpOnly: true })
      .json({
        success: true,
        msg: "Logged Out",
      });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

exports.followUser = async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    const loggedInUser = await User.findById(req.user._id);

    if (!userToFollow) {
      res.status(404).json({
        success: false,
        msg: "User Not Found",
      });
    }

    if (loggedInUser.following.includes(userToFollow._id)) {
      const followingIndex = loggedInUser.following.indexOf(userToFollow._id);
      const followerIndex = userToFollow.followers.indexOf(loggedInUser._id);

      loggedInUser.following.splice(followingIndex, 1);
      userToFollow.followers.splice(followerIndex, 1);

      await loggedInUser.save();
      await userToFollow.save();

      res.status(200).json({
        success: true,
        msg: "User unfollowed",
      });
    } else {
      loggedInUser.following.push(userToFollow._id);
      userToFollow.followers.push(loggedInUser._id);

      await loggedInUser.save();
      await userToFollow.save();

      res.status(200).json({
        success: true,
        msg: "User followed",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+password");

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        msg: "Please enter old password and new password",
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        msg: "Invalid Old Password",
      });
    }

    user.password = newPassword;

    await user.save();

    res.status(200).json({
      success: true,
      msg: "Password Updated",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+password");
    const { email, name, avatar } = req.body;

    if (name) {
      user.name = name;
    }

    if (email) {
      user.email = email;
    }

    if (avatar) {
      await cloudinary.v2.uploader.destroy(user.avatar.public_id);

      const myCloud = await cloudinary.v2.uploader.upload(avatar, {
        folder: "avatars",
      });

      user.avatar.public_id = myCloud.public_id;
      user.avatar.url = myCloud.secure_url;
    }

    await user.save();

    res.status(200).json({ success: true, msg: "Profile Updated" });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

exports.deleteMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const posts = user.posts;
    const followers = user.followers;
    const following = user.following;
    const userId = user._id;

    await cloudinary.v2.uploader.destroy(user.avatar.public_id);

    user.remove();

    res.cookie("token", null, {
      httpOnly: true,
      expires: new Date(Date.now()),
    });

    //delete all posts of loggedin User
    for (let i = 0; i < posts.length; i++) {
      const post = await Post.findById(posts[i]);
      await cloudinary.v2.uploader.destroy(post.image.public_id);
      await post.remove();
    }

    //isko jo follow karte hai
    for (let i = 0; i < followers.length; i++) {
      const follower = await User.findById(followers[i]);
      const index = follower.following.indexOf(userId);
      follower.following.splice(index, 1);
      await follower.save();
    }

    //ye jisko follow karta hai
    for (let i = 0; i < following.length; i++) {
      const follow = await User.findById(following[i]);
      const index = follow.followers.indexOf(userId);
      follow.followers.splice(index, 1);
      await follow.save();
    }

    const allPosts = await Post.find();

    for (let i = 0; i < allPosts.length; i++) {
      const onePost = await Post.findById(allPosts[i]._id);

      for (let j = 0; j < onePost.comments.length; j++) {
        if (onePost.comments[j].user === userId) {
          onePost.comments.splice(j, 1);
        }
      }

      await onePost.save();
    }

    for (let i = 0; i < allPosts.length; i++) {
      const onePost = await Post.findById(allPosts[i]._id);

      for (let j = 0; j < onePost.likes.length; j++) {
        if (onePost.likes[j] === userId) {
          onePost.likes.splice(j, 1);
        }
      }

      await onePost.save();
    }

    res.status(200).json({
      success: true,
      msg: "User Deleted SuccessFully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

exports.myProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "posts followers following"
    );

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "posts followers following"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const user = await User.find({
      name: { $regex: req.query.name, $options: "i" },
    });

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

exports.getMyPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const posts = [];

    for (let i = 0; i < user.posts.length; i++) {
      const post = await Post.findById(user.posts[i]).populate(
        "likes comments.user owner"
      );
      posts.push(post);
    }

    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    const getResetPasswordToken = () => {
      const resetToken = crypto.randomBytes(20).toString("hex");

      user.resetPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

      return resetToken;
    };

    const resetPasswordToken = getResetPasswordToken();

    await user.save();

    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/password/reset/${resetPasswordToken}/`;

    const message = `Reset your password by click on the link \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Reset Password",
        message,
      });

      res.status(200).json({
        success: true,
        msg: `Email send to ${user.email}`,
      });
    } catch (error) {
      user.resetPasswordExpire = undefined;
      user.resetPasswordToken = undefined;
      await user.save();

      return res.status(500).json({
        success: false,
        msg: error.message,
      });
    }

    if (!user) {
      return res.status(404).json({
        success: true,
        msg: "User Not Found",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    // console.log(req.params.token);
    // console.log(resetPasswordToken);

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        msg: "invalid token or expire",
      });
    }

    user.password = req.body.password;
    user.resetPasswordExpire = undefined;
    user.resetPasswordToken = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      msg: "Password Updated",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

exports.getUserPosts = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    const posts = [];

    for (let i = 0; i < user.posts.length; i++) {
      const post = await Post.findById(user.posts[i]).populate(
        "likes comments.user owner"
      );
      posts.push(post);
    }

    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message,
    });
  }
};

// exports.Ashish = async (req, res) => {
//   try {
//     const userId = "62d2237b53f74aa01ec6d8b0";

//     const allPosts = await Post.find();

//     for (let i = 0; i < allPosts.length; i++) {
//       const onePost = await Post.findById(allPosts[i]._id);

//       for (let j = 0; j < onePost.comments.length; j++) {
//         if (onePost.comments[j].user === userId) {
//           onePost.comments.splice(j, 1);
//         }
//       }

//       await onePost.save();
//     }

//     for (let i = 0; i < allPosts.length; i++) {
//       const onePost = await Post.findById(allPosts[i]._id);

//       for (let j = 0; j < onePost.likes.length; j++) {
//         if (onePost.likes[j] === userId) {
//           onePost.likes.splice(j, 1);
//         }
//       }

//       await onePost.save();
//     }

//     res.status(200).json({
//       success: true,
//       // posts,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       msg: error.message,
//     });
//   }
// };
