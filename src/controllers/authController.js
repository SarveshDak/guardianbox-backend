import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

// ---------------- SIGNUP ----------------
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists)
      return res.status(400).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    });

    const token = jwt.sign({ id: user.id }, "SECRET_KEY", {
      expiresIn: "7d",
    });

    res.json({ token, user: { id: user.id, name, email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup failed" });
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

    const token = jwt.sign({ id: user.id }, "SECRET_KEY", {
      expiresIn: "7d",
    });

    res.json({ token, user: { id: user.id, name: user.name, email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
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

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

// ---------------- UPGRADE TO PRO ----------------
export const upgradeToPro = async (req, res) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { tier: "PRO" },
    });

    res.json({
      message: "Upgraded to PRO successfully",
      tier: updatedUser.tier,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upgrade failed" });
  }
};


export const downgradeToFree = async (req, res) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { tier: "FREE" },
    });

    res.json({
      message: "Switched back to Free Plan",
      tier: updatedUser.tier,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Downgrade failed" });
  }
};
