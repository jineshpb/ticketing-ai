import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import User from "../models/user.js";
import { inngest } from "../inngest/client.js";

export const signup = async (req, res) => {
    const {email, password, skills} = req.body;

    // Validate required fields
    if (!email || !password) {
        return res.status(400).json({error: "Email and password are required"});
    }

    // Normalize skills to array
    let skillsArray = [];
    if (skills) {
        if (Array.isArray(skills)) {
            skillsArray = skills;
        } else if (typeof skills === 'string') {
            // If it's a string, split by comma or use as single item
            skillsArray = skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
        }
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await User.create({email, password: hashedPassword, skills: skillsArray})

        //fire inngest event (don't fail signup if this fails)
        try {
            await inngest.send({
                name: "user/signup",
                data: {
                    email,
                }
            })
        } catch (inngestError) {
            console.error("Inngest event failed:", inngestError);
            // Continue with signup even if Inngest fails
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({error: "JWT_SECRET not configured"});
        }

        const token = jwt.sign(
            {
                _id: user._id, role: user.role
            },
            process.env.JWT_SECRET,
        )

        res.json({user,token})
    } catch (error) {
        console.error("Signup error:", error);
        
        // Handle duplicate email error
        if (error.code === 11000) {
            return res.status(409).json({error: "Email already exists"});
        }
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({error: "Validation failed", details: error.message});
        }
        
        res.status(500).json({error: "Sign up failed", details: error.message})
    }
}

export const login = async (req, res) => {
    const {email, password} = req.body;

    try {
        const user = await User.findOne({email});
        if (!user) {
            return res.status(401).json({error: "User not found"});
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({error: "Invalid credentials"});
        }

        const token = jwt.sign(
            {_id: user._id, role: user.role},
            process.env.JWT_SECRET,
        )

        res.json({user,token})
    } catch (error) {
        res.status(500).json({error: "Login failed", details: error.message})
    }
}

export const logout = async (req, res) => {
    try {
        req.headers.authorization.split(" ")[1]
        if (!token) {
            return res.status(401).json({error: "Unauthorized"});
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({error: "Unauthorized"});
            }

            res.json({message: "Logged out successfully"})
        });
    } catch (error) {
        res.status(500).json({ error: "Logout failed", details: error.message });
    }
};

export const updateUser = async (req, res) => {
    const {email, role, skills=[]} = req.body;

    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({error: "Forbidden. Only admins can update users."});
        }
        const user = await User.findOne({email});
        if (!user) {
            return res.status(401).json({error: "User not found"});
        }

        await User.updateOne({email}, {skills: skills.length ?  skills : user.skills, role});
        res.json({message: "User updated successfully"})

        
    } catch (error) {
        res.status(500).json({error: "Update failed", details: error.message})
    }
}

export const getUsers = async (req, res) => {
    try {
       if (req.user.role !== "admin") {
        return res.status(403).json({error: "Forbidden. Only admins can get users."});
       }

       const users = await User.find().select("-password");
       return res.json(users)
    } catch (error) {
        res.status(500).json({error: "Get users failed", details: error.message})
    }
}