import jwt from 'jsonwebtoken';

const createTokenAndSaveCookie = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_TOKEN, {
    expiresIn: "5D",
  });

  res.cookie("jwt", token, {
    httpOnly: true, // xss protection
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "none",
  });

  return token;
};

export default createTokenAndSaveCookie;