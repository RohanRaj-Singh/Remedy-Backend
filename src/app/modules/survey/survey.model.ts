// import { Schema, model } from "mongoose";
// import "../question/question.model"; // Ensure Question model is registered
// import {
//   departments,
//   ISurveyResponse,
//   locations,
//   SurveyResponseModel,
//   TUser,
// } from "./survey.interface";


// // -------------------- Extract enums dynamically --------------------

// const departmentEnum = departments.map((d) => d.department);
// const subDepartmentEnum = departments.flatMap((d) => d.subDepartments);

// const locationEnum = locations.map((l) =>
//   l.toLowerCase().replace(/\s+/g, "")
// );

// const ageEnum = ["18-24", "25-34", "35-44", "45-54", "55+"];

// const userSchema = new Schema<TUser>(
//   {
//     organizationId: {
//       type: Schema.Types.ObjectId,
//       ref: "Organization",
//       required: true,
//     },

//     department: {
//       type: String,
//       enum: departmentEnum,
//       required: true,
//       trim: true,
//     },

//     subDepartment: {
//       type: String,
//       enum: subDepartmentEnum,
//       required: true,
//       trim: true,
//     },

//     gender: {
//       type: String,
//       enum: ["male", "female", "other"],
//       required: true,
//       lowercase: true,
//       trim: true,
//     },

//     age: {
//       type: String,
//       enum: ageEnum,
//       required: true,
//       trim: true,
//     },

//     seniorityLevel: {
//       type: String,
//       enum: ["senior", "manager", "employee"],
//       required: true,
//       lowercase: true,
//       trim: true,
//     },

//     location: {
//       type: String,
//       enum: locationEnum,
//       required: true,
//       lowercase: true,
//       trim: true,
//     },
//   }
// );


// const answerSchema = new Schema({
//   question: { type: Schema.Types.ObjectId, ref: "questions", required: true },
//   answerIndex: { type: Number, required: true },
//   score: { type: Number, required: true },
// });

// const domainRiskSchema = new Schema({
//   domain: { type: String, required: true },
//   riskCount: { type: Number, default: 0 },
// });

// const surveyResponseSchema = new Schema<ISurveyResponse, SurveyResponseModel>(
//   {
//     organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
//     user: { type: userSchema, required: true },
//     responses: [answerSchema],
//     questions: [{ type: Schema.Types.ObjectId, ref: "questions" }],
//     highRiskCount: { type: Number, default: 0 },
//     status: {
//       type: String,
//       enum: ["in-progress", "completed"],
//       default: "in-progress",
//     },
//     completedAt: { type: Date },
//     followUpQuestions: [{ type: Schema.Types.ObjectId, ref: "questions" }],
//     domainRisks: [domainRiskSchema],
//   },
//   { timestamps: true }
// );

// export const SurveyResponse = model<ISurveyResponse, SurveyResponseModel>(
//   "SurveyResponse",
//   surveyResponseSchema
// );


import { Schema, model } from "mongoose";
import "../question/question.model";

import {
  departments,
  ISurveyResponse,
  locations,
  SurveyResponseModel,
  TUser,
} from "./survey.interface";


// -------------------- Extract enums dynamically --------------------

// Stream list
const streamEnum = departments.map((s) => s.stream);

// Function list (flat)
const functionEnum = departments.flatMap((s) =>
  s.functions.map((f) => f.function)
);

// Department list (flat)
const departmentEnum = departments.flatMap((s) =>
  s.functions.flatMap((f) => f.departments)
);

// Location enum
const locationEnum = locations.map((l) =>
  l.toLowerCase().replace(/\s+/g, "")
);

// Age enums
const ageEnum = ["18-24", "25-34", "35-44", "45-54", "55+"];



// -------------------- USER SCHEMA --------------------

const userSchema = new Schema<TUser>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    stream: {
      type: String,
      enum: streamEnum,
      required: true,
      trim: true,
    },

    function: {
      type: String,
      enum: functionEnum,
      required: true,
      trim: true,
    },

    department: {
      type: String,
      enum: departmentEnum,
      required: true,
      trim: true,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
      lowercase: true,
      trim: true,
    },

    age: {
      type: String,
      enum: ageEnum,
      required: true,
      trim: true,
    },

    seniorityLevel: {
      type: String,
      enum: ["senior", "manager", "employee"],
      required: true,
      lowercase: true,
      trim: true,
    },

    location: {
      type: String,
      enum: locationEnum,
      required: true,
      lowercase: true,
      trim: true,
    },
  }
);



// -------------------- ANSWER SCHEMA --------------------

const answerSchema = new Schema({
  question: { type: Schema.Types.ObjectId, ref: "questions", required: true },
  answerIndex: { type: Number, required: true },
  score: { type: Number, required: true },
});


// -------------------- DOMAIN RISK SCHEMA --------------------

const domainRiskSchema = new Schema({
  domain: { type: String, required: true },
  riskCount: { type: Number, default: 0 },
});


// -------------------- SURVEY RESPONSE SCHEMA --------------------

const surveyResponseSchema = new Schema<ISurveyResponse, SurveyResponseModel>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },

    user: { type: userSchema, required: true },

    responses: [answerSchema],

    questions: [{ type: Schema.Types.ObjectId, ref: "questions" }],

    highRiskCount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["in-progress", "completed"],
      default: "in-progress",
    },

    completedAt: { type: Date },

    followUpQuestions: [{ type: Schema.Types.ObjectId, ref: "questions" }],

    domainRisks: [domainRiskSchema],
  },
  { timestamps: true }
);

export const SurveyResponse = model<ISurveyResponse, SurveyResponseModel>(
  "SurveyResponse",
  surveyResponseSchema
);
