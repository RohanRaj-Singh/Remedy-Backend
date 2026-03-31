import { Schema, Types, model } from "mongoose";

export interface IEmployeeInvite {
  organizationId: Types.ObjectId;
  email: string;
  streamRef: Types.ObjectId;
  functionRef: Types.ObjectId;
  departmentRef: Types.ObjectId;
  locationRef: Types.ObjectId;
  stream: string;
  function: string;
  department: string;
  location: string;
  age: string;
  gender: "male" | "female" | "other";
  tokenHash: string;
  tokenExpiresAt: Date;
  emailSent: boolean;
  emailSentAt?: Date;
  completed: boolean;
  completedAt?: Date;
  lastSurveyId?: Types.ObjectId;
}

const employeeInviteSchema = new Schema<IEmployeeInvite>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "organization",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    streamRef: {
      type: Schema.Types.ObjectId,
      ref: "survey_references",
      required: true,
    },
    functionRef: {
      type: Schema.Types.ObjectId,
      ref: "survey_references",
      required: true,
    },
    departmentRef: {
      type: Schema.Types.ObjectId,
      ref: "survey_references",
      required: true,
    },
    locationRef: {
      type: Schema.Types.ObjectId,
      ref: "survey_references",
      required: true,
    },
    stream: { type: String, required: true, trim: true },
    function: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    age: { type: String, required: true, trim: true },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
      lowercase: true,
      trim: true,
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    tokenExpiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    emailSent: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailSentAt: { type: Date },
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    completedAt: { type: Date },
    lastSurveyId: {
      type: Schema.Types.ObjectId,
      ref: "SurveyResponse",
    },
  },
  { timestamps: true }
);

employeeInviteSchema.index({ organizationId: 1, email: 1 }, { unique: true });

export const EmployeeInviteModel = model<IEmployeeInvite>(
  "employee_invites",
  employeeInviteSchema
);
