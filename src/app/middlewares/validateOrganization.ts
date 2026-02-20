import httpStatus from "http-status";
import catchAsync from "../utils/catch_async";
import { JwtPayload } from "jsonwebtoken";
import { verifyToken } from "../utils/JWT";
import { AppError } from "../utils/app_error";
import { organizationModel } from "../modules/organization/organization.model";

const validateOrganization = () => {
  return catchAsync(async (req: any, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
      throw new AppError("Token not found: Unauthorized user!", httpStatus.UNAUTHORIZED);
    }

    let decoded: JwtPayload | null = null;

    try {
      decoded = verifyToken(token) as JwtPayload;
    } catch {
      throw new AppError("Invalid or expired token!", httpStatus.UNAUTHORIZED);
    }

    if (!decoded || !decoded._id) {
      throw new AppError("Invalid token payload!", httpStatus.UNAUTHORIZED);
    }

    const organization = await organizationModel.findOne({ _id: decoded._id });

    if (!organization) {
      throw new AppError("No organization found for this user!", httpStatus.FORBIDDEN);
    }

    req.loggedInUser = decoded;
    next();
  });
};

export default validateOrganization;
