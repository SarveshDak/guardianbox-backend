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
    console.log("📝 Signup request received:", { body: req.body });

    const { name, email, password } = req.body;

    // Basic validations
    if (!name || !email || !password) {
      console.log("❌ Missing fields");
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 8) {
      console.log("❌ Password too short");
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("❌ Invalid email format");
      return res.status(400).json({ message: "Invalid email format" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const trimmedName = name.trim();

    console.log("🔍 Checking if user exists:", normalizedEmail);

    // Check if user exists
    const exists = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (exists) {
      console.log("❌ Email already registered");
      return res.status(409).json({ message: "Email already registered" });
    }

    console.log("🔐 Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("👤 Creating new user...");
    const newUser = await prisma.user.create({
      data: {
        name: trimmedName,
        email: normalizedEmail,
        password: hashedPassword,
        tier: "FREE", // default plan
      },
    });

    console.log("✅ User created successfully:", newUser.id);

    const token = signToken(newUser.id);

    return res.status(201).json({
      message: "Account created successfully",
      token,
      user: sanitizeUser(newUser),
    });
  } catch (error) {
    console.error("❌ SIGNUP ERROR:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta,
    });

    // Handle Prisma-specific errors
    if (error.code === "P2002") {
      return res.status(409).json({ 
        message: "Email already registered" 
      });
    }

    if (error.code === "P2003") {
      return res.status(400).json({ 
        message: "Database constraint violation" 
      });
    }

    return res.status(500).json({ 
      message: "Signup failed. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

// ---------------- LOGIN ----------------
export const login = async (req, res) => {
  try {
    console.log("🔑 Login request received");

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    console.log("🔍 Looking for user:", normalizedEmail);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      console.log("❌ User not found");
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log("🔐 Verifying password...");
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log("❌ Password mismatch");
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log("✅ Login successful");

    const token = signToken(user.id);

    return res.json({
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("❌ LOGIN ERROR:", error);
    return res.status(500).json({ 
      message: "Login failed. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
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

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    console.error("❌ PROFILE ERROR:", error);
    return res.status(500).json({ 
      message: "Failed to fetch profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

// ---------------- UPGRADE TO PRO ----------------
export const upgradeToPro = async (req, res) => {
  try {
    console.log("⬆️ Upgrading user to PRO:", req.user.id);

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { tier: "PRO" },
    });

    console.log("✅ User upgraded successfully");

    return res.json({
      message: "Upgraded to PRO successfully",
      tier: updatedUser.tier,
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    console.error("❌ UPGRADE ERROR:", error);
    return res.status(500).json({ 
      message: "Upgrade failed. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

// ---------------- DOWNGRADE TO FREE ----------------
export const downgradeToFree = async (req, res) => {
  try {
    console.log("⬇️ Downgrading user to FREE:", req.user.id);

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { tier: "FREE" },
    });

    console.log("✅ User downgraded successfully");

    return res.json({
      message: "Switched back to FREE plan",
      tier: updatedUser.tier,
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    console.error("❌ DOWNGRADE ERROR:", error);
    return res.status(500).json({ 
      message: "Downgrade failed. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};