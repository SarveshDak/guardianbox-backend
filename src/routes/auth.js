import express from "express";
import { 
  signup, 
  login, 
  me, 
  upgradeToPro, 
  downgradeToFree 
} from "../controllers/authController.js";

import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

// SIGNUP
router.post("/signup", signup);

// LOGIN
router.post("/login", login);

// PROFILE
router.get("/me", verifyToken, me);

// UPGRADE TO PRO
router.post("/upgrade", verifyToken, upgradeToPro);

// DOWNGRADE TO FREE
router.post("/downgrade", verifyToken, downgradeToFree);

export default router;
