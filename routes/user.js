import express from "express";
import { signup, login, logout, updateUser, getUsers } from "../controllers/user";
import { authenticate } from "../middlewares/auth";

const router = express.Router();

router.post("/update-user", authenticate, updateUser);
router.get("/users", authenticate, getUsers);

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);



export default router;