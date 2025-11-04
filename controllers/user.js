import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { User } from "../models/user"
import { Inngest } from "inngest"
import { inngest } from "../inngest/client"

export const sugnup = async (req, res) => {
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
            return res.status(401).json({error: "Invalid password"});
        }

        const token = jwt.sign(
            {_id: user._id, role: user.role},
        )
    } catch (error) {
        res.status(500).json({error: "Login failed", details: error.message})
    }
}