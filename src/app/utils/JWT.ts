import jwt, { JwtPayload, SignOptions, Secret } from "jsonwebtoken";
import { getEnv } from "../../config/env";

// --- Create Token ---
export const createToken = (
  payload: object,
  options: SignOptions = {}
): string => {
  const env = getEnv();
  const jwtSecret = env.jwtSecret as Secret;
  const jwtExpiresIn = env.jwtExpiresIn as `${number}${"d" | "h" | "m" | "s"}`;

  const signOptions: SignOptions = {
    ...options,
    expiresIn: jwtExpiresIn,
  };

  return jwt.sign(payload, jwtSecret, signOptions);
};

// --- Verify Token ---
export const verifyToken = (token: string): JwtPayload | null => {
  const jwtSecret = getEnv().jwtSecret as Secret;

  try {
    return jwt.verify(token, jwtSecret) as JwtPayload;
  } catch {
    return null;
  }
};
