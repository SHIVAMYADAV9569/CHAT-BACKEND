import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import bcrypt from "bcryptjs";
import createTokenAndSaveCookie from "../jwt/generateToken.js";
import { emitUserUpdate } from "../SocketIO/server.js";

//Signup Controller
export const signup = async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;
        //console.log(name, email, password, confirmPassword);

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
        });

        await newUser.save();

        // Generate token and set cookie
        const token = createTokenAndSaveCookie(newUser._id, res);

        res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                avatarUrl: newUser.avatarUrl,
                status: newUser.status,
            },
        });
    } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
    }
};

// Login Controller
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const token = createTokenAndSaveCookie(user._id, res);

        res.status(200).json({
            message: "User logged in successfully",
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
                status: user.status,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

// Logout Controller
export const logout = (req, res) => {
    try {
        res.clearCookie('jwt');
        res.status(200).json({ message: "User logged out successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};





export const getUserProfile = async (req, res) => {
  try {
    const loggedInUser = req.user._id;
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiverId: loggedInUser,
          isRead: false,
        },
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
    ]);

    const countsBySender = unreadCounts.reduce((acc, item) => {
      acc[item._id.toString()] = item.count;
      return acc;
    }, {});

    const filiteredUsers = await User.find({ _id: { $ne: loggedInUser } })
      .select("-password")
      .lean();

    const usersWithNotification = filiteredUsers.map((user) => ({
      ...user,
      unreadCount: countsBySender[user._id.toString()] || 0,
    }));

    res.status(200).json({ filiteredUsers: usersWithNotification });
  } catch (error) {
    console.log("Error in allUsers Controller:" + error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const loggedInUser = req.user._id;
    const { avatarUrl, name } = req.body;

    const update = {};
    if (avatarUrl) update.avatarUrl = avatarUrl;
    if (name) update.name = name;
    if (req.file) {
      const baseUrl = process.env.SERVER_URL || "http://localhost:5001";
      update.avatarUrl = `${baseUrl}/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(loggedInUser, update, {
      new: true,
    }).select("-password");

    // Emit user update event
    emitUserUpdate(loggedInUser.toString(), user);

    res.status(200).json({ user });
  } catch (error) {
    console.log("Error updating profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const postStatus = async (req, res) => {
  try {
    const loggedInUser = req.user._id;
    const { text, type, mediaUrl } = req.body;
    const baseUrl = process.env.SERVER_URL || "http://localhost:5001";

    let finalMediaUrl = mediaUrl || "";
    if (req.file) {
      finalMediaUrl = `${baseUrl}/uploads/${req.file.filename}`;
    }

    const updatedStatus = {
      type: type || (finalMediaUrl ? "image" : "text"),
      text: text || "",
      mediaUrl: finalMediaUrl,
      postedAt: new Date(),
      viewers: [],
      likes: [],
    };

    const user = await User.findByIdAndUpdate(
      loggedInUser,
      { status: updatedStatus },
      { new: true }
    ).select("-password");

    // Emit user update event
    emitUserUpdate(loggedInUser.toString(), user);

    res.status(200).json({ status: user.status });
  } catch (error) {
    console.log("Error posting status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const likeStatus = async (req, res) => {
  try {
    const loggedInUser = req.user._id;
    const { userId } = req.params;

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const userLiked = targetUser.status.likes.some((item) =>
      item.userId.equals(loggedInUser)
    );
    if (!userLiked) {
      targetUser.status.likes.push({
        userId: loggedInUser,
        name: req.user.name,
        avatarUrl: req.user.avatarUrl || "",
      });
      await targetUser.save();
    }

    res.status(200).json({ status: targetUser.status });
  } catch (error) {
    console.log("Error liking status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const viewStatus = async (req, res) => {
  try {
    const loggedInUser = req.user._id;
    const { userId } = req.params;

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const alreadyViewed = targetUser.status.viewers.some((item) =>
      item.userId.equals(loggedInUser)
    );
    if (!alreadyViewed) {
      targetUser.status.viewers.push({
        userId: loggedInUser,
        name: req.user.name,
      });
      await targetUser.save();
    }

    res.status(200).json({ status: targetUser.status });
  } catch (error) {
    console.log("Error viewing status:", error);
    res.status(500).json({ message: "Server error" });
  }
};
