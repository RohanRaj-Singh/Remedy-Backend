import mongoose from "mongoose";
import { organizationModel } from "./organization.model";
import { AppError } from "../../utils/app_error";
import status from "http-status";
import bcrypt from "bcrypt";
import { createToken } from "../../utils/JWT";
import { IOrganization } from "./organization.interface";

export const organizationService = {
  // ✅ Create organization with transaction
  async postOrganizationIntoDB(data: any) {
    const isOrganizationExist = await organizationModel.findOne({
      name: data.name,
    });

    if (isOrganizationExist) {
      throw new AppError("Organization already exist", status.CONFLICT);
    }

    const username =
      data.name.replace(/\s+/g, "").toUpperCase() +
      Math.floor(Math.random() * 1000).toString();

    const isUsernameExist = await organizationModel.findOne({
      username,
    });

    if (isUsernameExist) {
      throw new AppError("Username already exist", status.CONFLICT);
    }

    data.username = username;
    // Do NOT pre-set emailInvitationPassword here — it would be stored as plaintext.
    // The loginEmailInvitationsAccess service will backfill it (hashed) on first login.

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Step 1: Create organization inside transaction
      const [servay] = await organizationModel.create([data], { session });

      // Step 2: Update organization with survayProvideLink
      const result = await organizationModel.findByIdAndUpdate(
        servay._id,
        {
          $set: {
            survayProvideLink: `${process.env.FRONTEND_URL}/survey/?organizationId=${servay._id}`,
            organizationSurvaysLink: `${process.env.FRONTEND_URL}/organizationDashboard?organizationId=${servay._id}`,
          },
        },
        { new: true, session }
      );

      // Step 3: Commit transaction
      await session.commitTransaction();
      session.endSession();

      return result;
    } catch (error: unknown) {
      // Rollback on failure
      await session.abortTransaction();
      session.endSession();

      if (error instanceof Error) {
        throw new AppError(error.message, status.INTERNAL_SERVER_ERROR);
      } else {
        throw new AppError(
          "An unknown error occurred while posting organization.",
          status.INTERNAL_SERVER_ERROR
        );
      }
    }
  },

  async loginOrganization(data: IOrganization) {
    const user = await organizationModel
      .findOne({ username: data.username })
      .select("+password");
    console.log(user);

    if (!user) {
      throw new AppError("Invalid credentials", status.UNAUTHORIZED);
    }

    const isPasswordMatch = bcrypt.compare(
      data.password as string,
      user.password!
    );
    console.log(await isPasswordMatch);

   
    if(await isPasswordMatch === false) {
      throw new AppError("Invalid credentials", status.UNAUTHORIZED);
    }

    const token = createToken({ _id: user._id, username: user.username });

    return { token };
  },

  async loginEmailInvitationsAccess(data: Pick<IOrganization, "username" | "password">) {
    // Look up by emailInvitationUsername first; fall back to main username for orgs
    // that have never set a dedicated email-invitation username.
    const user = await organizationModel
      .findOne({
        $or: [
          { emailInvitationUsername: data.username },
          { emailInvitationUsername: { $exists: false }, username: data.username },
          { emailInvitationUsername: null, username: data.username },
          { emailInvitationUsername: "", username: data.username },
        ],
      })
      .select("+password +emailInvitationPassword");

    if (!user) {
      throw new AppError("Invalid credentials", status.UNAUTHORIZED);
    }

    // A valid bcrypt hash always starts with $2a$ or $2b$.
    // If emailInvitationPassword is missing or was accidentally stored as plaintext,
    // fall back to the main (properly-hashed) password.
    const isBcryptHash = (s: string) => /^\$2[ab]\$\d{2}\$/.test(s);
    const storedHash =
      user.emailInvitationPassword && isBcryptHash(user.emailInvitationPassword)
        ? user.emailInvitationPassword
        : user.password;

    if (!storedHash) {
      throw new AppError("Email invitations access is not configured", status.BAD_REQUEST);
    }

    const isPasswordMatch = await bcrypt.compare(data.password as string, storedHash);

    if (!isPasswordMatch) {
      throw new AppError("Invalid credentials", status.UNAUTHORIZED);
    }

    // Backfill: if emailInvitationPassword is absent or was stored as plaintext,
    // overwrite it with the hashed login password so future logins work correctly.
    if (!user.emailInvitationPassword || !isBcryptHash(user.emailInvitationPassword)) {
      user.emailInvitationPassword = user.password;
      user.emailInvitationPasswordUpdatedAt = new Date();
      await user.save();
    }

    const token = createToken({
      _id: user._id,
      username: user.username,
      scope: "email_invitation",
    });

    return { token };
  },

  async changeEmailInvitationsPassword(
    organizationId: string,
    data: { username: string; newPassword: string }
  ) {
    const user = await organizationModel
      .findById(organizationId)
      .select("+password +emailInvitationPassword");

    if (!user) {
      throw new AppError("Organization not found", status.NOT_FOUND);
    }

    if (!data.username) {
      throw new AppError("Username is required", status.BAD_REQUEST);
    }

    const normalizedUsername = data.username.trim();

    if (!normalizedUsername) {
      throw new AppError("Username is required", status.BAD_REQUEST);
    }

    // Check that the new emailInvitationUsername doesn't clash with another org's
    // emailInvitationUsername (main username uniqueness is unaffected).
    const emailInviteUsernameExists = await organizationModel.findOne({
      emailInvitationUsername: normalizedUsername,
      _id: { $ne: organizationId },
    });

    if (emailInviteUsernameExists) {
      throw new AppError("Username already exists", status.CONFLICT);
    }

    const newHashedPassword = await bcrypt.hash(data.newPassword, 12);

    // IMPORTANT: Only update email-invitation-specific fields.
    // Never touch `username` or `password` — those belong to the main admin login.
    await organizationModel.findByIdAndUpdate(organizationId, {
      $set: {
        emailInvitationUsername: normalizedUsername,
        emailInvitationPassword: newHashedPassword,
        emailInvitationPasswordUpdatedAt: new Date(),
      },
    });

    return { message: "Email invitations password changed successfully" };
  },

  // ✅ Get all organizations (with pagination & search)
  async getAllOrganizationFromDB(query: any) {
    const { page = 1, limit = 10, search = "" } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = search ? { name: { $regex: search, $options: "i" } } : {};

    const result = await organizationModel
      .find(filter)
      .skip(skip)
      .limit(Number(limit));

    const total = await organizationModel.countDocuments(filter);

    return {
      result,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  },

  // ✅ Get single organization by ID
  async getSingleOrganizationFromDB(id: string) {
    try {
      const result = await organizationModel.findById(id);
      if (!result) {
        throw new AppError("Organization not found", status.NOT_FOUND);
      }
      return result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new AppError(error.message, status.INTERNAL_SERVER_ERROR);
      } else {
        throw new AppError(
          "An unknown error occurred while fetching by ID.",
          status.INTERNAL_SERVER_ERROR
        );
      }
    }
  },

  // ✅ Update organization
  async updateOrganizationIntoDB(data: IOrganization) {
    try {
      const isExist = (await organizationModel.findOne({
        _id: data.name,
      })) as IOrganization;

      if (!isExist) {
        throw new AppError("Organization not found", status.NOT_FOUND);
      }

      if (isExist.isDelete) {
        throw new AppError(
          "Organization is already deleted",
          status.BAD_REQUEST
        );
      }

      const result = await organizationModel.findByIdAndUpdate(
        isExist._id,
        data,
        {
          new: true,
        }
      );

      return result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new AppError(error.message, status.INTERNAL_SERVER_ERROR);
      } else {
        throw new AppError(
          "An unknown error occurred while updating organization.",
          status.INTERNAL_SERVER_ERROR
        );
      }
    }
  },

  // ✅ Soft delete organization
  async deleteOrganizationFromDB(id: string) {
    try {
      const isExist = await organizationModel.findOne({ _id: id });

      if (!isExist) {
        throw new AppError("Organization not found", status.NOT_FOUND);
      }

      if (isExist.isDelete) {
        throw new AppError("Organization already deleted", status.BAD_REQUEST);
      }

      await organizationModel.updateOne({ _id: id }, { isDelete: true });
      return { message: "Organization deleted successfully" };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new AppError(error.message, status.INTERNAL_SERVER_ERROR);
      } else {
        throw new AppError(
          "An unknown error occurred while deleting organization.",
          status.INTERNAL_SERVER_ERROR
        );
      }
    }
  },
};
