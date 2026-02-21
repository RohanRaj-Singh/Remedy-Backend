import mongoose, { Schema, Document } from "mongoose";
import { Question } from "./question.interface";

const QuestionSchema: Schema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length === 4,
        message: "Four option is required.",
      },
    },
    domain: {
      type: String,
      enum: [
        "Personal Wellbeing",
        "Burnout",
        "Workload & Efficiency",
        "Workplace Satisfaction",
        "Leadership & Alignment",
        "Coworker Relationships",
        "Psych. Safety",
        "Depression Risk",
        "Anxiety Risk",
        "Mental Health Risk",
        "Burnout Risk",
        "Fairness & Recognition",
        "Burnout Intensity",
        "Depression Severity",
        "Anxiety Severity",
        "Anxiety Symptom",
        "Health Impact",
        "Root Cause Intensity",
        "Fear/Blame Intensity",
        "Trust Refinement",
      ],
      required: true,
    },

    weight: {
      type: Number,
      required: true,
    },
    isInverted: {
      type: Boolean,
      required: true,
    },
    isFollowUp: {
      type: Boolean,
      required: true,
    },
    dashboardDomain: {
      type: String,
      required: true,
      enum: [
        "Clinical Risk Index",
        "Psychological Safety Index",
        "Workload & Efficiency",
        "Leadership & Alignment",
        "Satisfaction & Engagement",
      ],
    },
    dashboardDomainMaxPossibleScore: {
      type: Number,
      required: true,
    },
    dashboardDomainWeight: {
      type: Number,
      required: true,
    },
    isDeleted:{
      type:Boolean,
      default:false
    }

  },
  
    
);

export const questionModel = mongoose.model<Question>(
  "questions",
  QuestionSchema
);
