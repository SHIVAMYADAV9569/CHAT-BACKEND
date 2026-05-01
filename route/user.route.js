import express from "express";
import multer from "multer";
import path from "path";
import {
  signup,
  login,
  logout,
  getUserProfile,
  updateProfile,
  postStatus,
  likeStatus,
  viewStatus,
} from "../controller/user.controller.js";
import secureRoute from "../middleware/secureRoute.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve("uploads"));
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const uniqueName = `${timestamp}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/getUserProfile", secureRoute, getUserProfile);
router.post("/update-profile", secureRoute, upload.single("avatar"), updateProfile);
router.post("/status", secureRoute, upload.single("media"), postStatus);
router.post("/status/:userId/like", secureRoute, likeStatus);
router.post("/status/:userId/view", secureRoute, viewStatus);

export default router;