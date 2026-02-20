export interface Question {
  id: string;
  question: string;
  options: string[];
  domain:
    | "Personal Wellbeing"
    | "Burnout"
    | "Workload & Efficiency"
    | "Workplace Satisfaction"
    | "Leadership & Alignment"
    | "Coworker Relationships"
    | "Psych. Safety"
    | "Depression Risk"
    | "Anxiety Risk"
    | "Mental Health Risk"
    | "Burnout Risk"
    | "Fairness & Recognition"
    | "Burnout Intensity"
    | "Depression Severity"
    | "Anxiety Severity"
    | "Anxiety Symptom"
    | "Health Impact"
    | "Root Cause Intensity"
    | "Fear/Blame Intensity"
    | "Trust Refinement";
  weight: number;
  isInverted: boolean;
  isFollowUp: boolean;
  dashboardDomain:
    | "Clinical Risk Index"
    | "Psychological Safety Index"
    | "Workload & Efficiency"
    | "Leadership & Alignment"
    | "Satisfaction & Engagement";
  dashboardDomainMaxPossibleScore: number;
  dashboardDomainWeight: number;
  isDeleted:boolean
}
