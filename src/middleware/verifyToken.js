import jwt from "jsonwebtoken";

export default function verifyToken(req, res, next) {
  // Authorization: Bearer token123
  const authHeader = req.headers["authorization"];

  if (!authHeader)
    return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];

  if (!token)
    return res.status(401).json({ message: "Invalid token" });

  jwt.verify(token, "SECRET_KEY", (err, decoded) => {
    if (err)
      return res.status(403).json({ message: "Unauthorized" });

    // decoded = { id: "userid", iat, exp }
    req.user = decoded;

    next();
  });
}
