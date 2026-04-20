import { Schema, Types, model } from "mongoose";

export type TSurveyReferenceKind =
  | "stream"
  | "function"
  | "department"
  | "location";

export interface ISurveyReference {
  organizationId: Types.ObjectId;
  kind: TSurveyReferenceKind;
  name: string;
  normalizedName: string;
}

const surveyReferenceSchema = new Schema<ISurveyReference>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "organization",
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ["stream", "function", "department", "location"],
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  { timestamps: true }
);

surveyReferenceSchema.index(
  { organizationId: 1, kind: 1, normalizedName: 1 },
  { unique: true }
);

export const SurveyReferenceModel = model<ISurveyReference>(
  "survey_references",
  surveyReferenceSchema
);
