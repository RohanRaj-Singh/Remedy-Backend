import { z } from "zod";

export const createQuestionZodSchema = z.object({
  question: z.string("Question is required").min(1, "Question cannot be empty"),
  options: z
    .array(z.string(), "Options must be an array of strings")
    .length(4, "Exactly 4 options are required"),
  domain: z.enum(
    [
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
    "Invalid domain. Allowed values: Personal Wellbeing, Burnout, Workload & Efficiency, Workplace Satisfaction, Leadership & Alignment, Coworker Relationships, Psych. Safety, Depression Risk, Anxiety Risk, Mental Health Risk, Burnout Risk, Fairness & Recognition, Burnout Intensity, Depression Severity, Anxiety Severity, Anxiety Symptom, Health Impact, Root Cause Intensity, Fear/Blame Intensity, Trust Refinement"
  ),
  weight: z.number("Weight is required"),
  isInverted: z.boolean().optional(),
  isFollowUp: z.boolean("isFollowUp is required"),
  dashboardDomain: z.enum(
    [
      "Clinical Risk Index",
      "Psychological Safety Index",
      "Workload & Efficiency",
      "Leadership & Alignment",
      "Satisfaction & Engagement",
    ],
    "Invalid dashboard domain. Allowed values: Clinical Risk Index, Psychological Safety Index, Workload & Efficiency, Leadership & Alignment, Satisfaction & Engagement"
  ),
});
