import httpStatus from "http-status";
import { JwtPayload } from "jsonwebtoken";
import catchAsync from "../utils/catch_async";
import { AppError } from "../utils/app_error";
import { verifyToken } from "../utils/JWT";
import { organizationModel } from "../modules/organization/organization.model";

const validateEmailInvitationAccess = () => {
  return catchAsync(async (req: any, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
      throw new AppError("Token not found: Unauthorized user!", httpStatus.UNAUTHORIZED);
    }

    const decoded = verifyToken(token) as JwtPayload | null;

    if (!decoded || !decoded._id || decoded.scope !== "email_invitation") {
      throw new AppError("Invalid or expired email invitations token!", httpStatus.UNAUTHORIZED);
    }

    const organization = await organizationModel.findById(decoded._id);

    if (!organization) {
      throw new AppError("No organization found for this user!", httpStatus.FORBIDDEN);
    }

    req.loggedInUser = decoded;
    next();
  });
};

export default validateEmailInvitationAccess;
