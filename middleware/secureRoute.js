import jwt from "jsonwebtoken";
import User from "../models/user.model.js";


const secureRoute = async (req, res, next) => {
  try {
    let token = req.cookies.jwt;
    if (!token) {
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return res.status(401).json({ error: "No token, authorization denied" });
    }

    const verified = jwt.verify(token, process.env.JWT_TOKEN);
    if (!verified) {
      return res.status(403).json({ message: "Invalid token" });
    }

    const user = await User.findById(verified.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log(error);
    res.status(501).json({ message: " Internal server error " });
  }
};
export default secureRoute;