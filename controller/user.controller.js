import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import createTokenAndSaveCookie from "../jwt/generateToken.js";

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





    export const getUserProfile = async (req, res) =>{
    try {
        const loggedInUser = req.user._id;
        const filiteredUsers = await User.find({_id:{$ne: loggedInUser }, }).select("-password");
        res.status(201).json({filiteredUsers });
    } catch (error) {
        console.log("Error in allUsers Controller:" +error);
        res.status(500).json({message: "Server error"});
    }  
}