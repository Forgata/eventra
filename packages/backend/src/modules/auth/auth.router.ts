import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { requireAuth } from "../../middlewares/require-auth.middleware.js";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);
router.get("/me", requireAuth, AuthController.me);

export { router as authRouter };
