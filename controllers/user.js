import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { User } from "../models/user"
import { Inngest } from "inngest"
import { inngest } from "../inngest/client"

export const signup = async (req, res) => {
    const {email, password, skills=[]} = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await User.create({email, password: hashedPassword, skills})

        //fire inngest event
        await inngest.send({
            name: "user/signup",
            data: {
                email,
            }

           
        })
        const token = jwt.sign(
            {
                _id: user._id, role: user.role
            },
            process.env.JWT_SECRET,
        )

        res.json({user,token})
    } catch (error) {
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