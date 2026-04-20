import jwt, { JwtPayload, SignOptions, Secret } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as Secret;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "1d") as `${number}${
  | "d"
  | "h"
  | "m"
  | "s"}`;

// --- Create Token ---
export const createToken = (
  payload: object,
  options: SignOptions = {}
): string => {
  if (!JWT_SECRET) {
    throw new Error("JWT secret is not defined in environment variables");
  }

  const signOptions: SignOptions = {
    ...options,
    expiresIn: JWT_EXPIRES_IN,
  };

  return jwt.sign(payload, JWT_SECRET, signOptions);
};

// --- Verify Token ---
export const verifyToken = (token: string): JwtPayload | null => {
  if (!JWT_SECRET) {
    throw new Error("JWT secret is not defined in environment variables");
  }

  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
};
