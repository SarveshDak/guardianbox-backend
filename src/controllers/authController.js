import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

// ---------------- UTILS ----------------
const JWT_SECRET = process.env.JWT_SECRET || "guardianbox_super_secret_fallback";

const signToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
};

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  tier: user.tier,
  createdAt: user.createdAt,
});

// ---------------- SIGNUP ----------------
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Basic validations
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    if (password.length < 8)
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });

    const normalizedEmail = email.toLowerCase().trim();

    const exists = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (exists)
      return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        tier: "FREE", // default plan
      },
    });

    const token = signToken(newUser.id);

    return res.status(201).json({
      token,
      user: sanitizeUser(newUser),
    });
  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    return res.status(500).json({ message: "Signup failed" });
  }
};

// ---------------- LOGIN ----------------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    const token = signToken(user.id);

    return res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
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
  } catch (error) {
    console.error("PROFILE ERROR:", error);
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
  } catch (error) {
    console.error("UPGRADE ERROR:", error);
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
  } catch (error) {
    console.error("DOWNGRADE ERROR:", error);
    return res.status(500).json({ message: "Downgrade failed" });
  }
};
