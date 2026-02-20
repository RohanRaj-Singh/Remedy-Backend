import express from "express";
import { userController } from "./user.controller";
const router = express.Router();

router.post("/login-super-admin", userController.loginSuperAdmin);


export const UserRoutes = router;
