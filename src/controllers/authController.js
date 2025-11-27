import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

// ---------------- UTILS ----------------
const JWT_SECRET = process.env.JWT_SECRET || "backup_dev_secret";

const signToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: "7d" });
};

// ---------------- SIGNUP ----------------
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    // Default tier = FREE
    const user = await prisma.user.create({
      data: { 
        name,
        email,
        password: hashed,
        tier: "FREE"
      },
    });

    const token = signToken(user.id);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tier: user.tier,
      },
    });
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    return res.status(500).json({ message: "Signup failed" });
  }
};

// ---------------- LOGIN ----------------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid email or password" });

    const token = signToken(user.id);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tier: user.tier,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Login failed" });
  }
};

// ---------------- PROFILE (ME) ----------------
export const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        tier: true,
        createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json(user);
  } catch (err) {
    console.error("PROFILE ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
};

// ---------------- UPGRADE TO PRO ----------------
export const upgradeToPro = async (req, res) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { tier: "PRO" },
    });

    return res.json({
      message: "Upgraded to PRO successfully",
      tier: updatedUser.tier,
    });
  } catch (err) {
    console.error("UPGRADE ERROR:", err);
    return res.status(500).json({ message: "Upgrade failed" });
  }
};

// ---------------- DOWNGRADE TO FREE ----------------
export const downgradeToFree = async (req, res) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { tier: "FREE" },
    });

    return res.json({
      message: "Switched back to FREE plan",
      tier: updatedUser.tier,
    });
  } catch (err) {
    console.error("DOWNGRADE ERROR:", err);
    return res.status(500).json({ message: "Downgrade failed" });
  }
};
