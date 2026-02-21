import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { IOrganization } from "./organization.interface";

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
    survayProvideLink: {
      type: String,
      required: false,
    },
    organizationSurvaysLink: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

organizationSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

export const organizationModel = mongoose.model<IOrganization>(
  "organization",
  organizationSchema
);
