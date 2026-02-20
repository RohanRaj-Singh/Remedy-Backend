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
