

// import { Model, Types } from "mongoose";

// // -------------------- Static Enums --------------------

// export const ageRanges = ["18-25", "25-34", "35-44", "44-54"] as const;

// export const seniorityLevels = [
//   "Senior Management",
//   "Manager / Team Lead",
//   "Employee / Individual Contributor",
// ] as const;

// export const locations = ["Block 60", "Msusundam", "Head Office"] as const;


// export const departments = [
//   {
//     department: "Business_Development",
//     subDepartments: [
//       "Business_Development",
//       "Mergers_And_Acquisitions"
//     ]
//   },
//   {
//     department: "Commercial",
//     subDepartments: [
//       "Commercial",
//       "Economics_And_Planning"
//     ]
//   },
//   {
//     department: "Exploration",
//     subDepartments: [
//       "Exploration",
//       "Exploration_Operated_Assets",
//       "Exploration_Study_And_Growth_Team"
//     ]
//   },
//   {
//     department: "Joint_Ventures",
//     subDepartments: [
//       "Joint_Ventures_Integrated_Gas",
//       "Joint_Ventures",
//       "Joint_Ventures_Business",
//       "Joint_Ventures_Technical_Soultion"
//     ]
//   },
//   {
//     department: "Contract_And_Procurement",
//     subDepartments: [
//       "Contract_And_Procurement",
//       "Contracts",
//       "Material_Management"
//     ]
//   },
//   {
//     department: "Finance_And_Procurement",
//     subDepartments: [
//       "BF_Non-Operated_Assets",
//       "BF_Operated_Assets",
//       "BF_Operated_Assets_Block_60_And_48",
//       "Finance_And_Procurement",
//       "Financial_Control",
//       "Financial_Planning_And_Analysis",
//       "Treasury"
//     ]
//   },
//   {
//     department: "Legal",
//     subDepartments: [
//       "Legal"
//     ]
//   },
//   {
//     department: "HSSE",
//     subDepartments: [
//       "HSE_Operated_Asset",
//       "HSE_Support",
//       "HSSE",
//       "OH_And_IH"
//     ]
//   },
//   {
//     department: "Musandam_Cluster",
//     subDepartments: [
//       "Musandam_Cluster"
//     ]
//   },
//   {
//     department: "Operated_Assets",
//     subDepartments: [
//       "Operated_Assets",
//       "Technical_Services",
//       "Well_Delivery"
//     ]
//   },
//   {
//     department: "Projects_Delivery",
//     subDepartments: [
//       "Construction",
//       "Engineering",
//       "Major_Projects",
//       "Off_Plot_Projects",
//       "Project_Technical_Services",
//       "Projects_Delivery"
//     ]
//   },
//   {
//     department: "Subsurface_And_Operation_60_And_48",
//     subDepartments: [
//       "Budget_And_Cost_Control",
//       "Growth_And_Planning",
//       "Operation_60_And_48_COE",
//       "Subsurface",
//       "Subsurface_And_Operation_60_And_48"
//     ]
//   },
//   {
//     department: "OQ_Exploration_And_Production",
//     subDepartments: [
//       "OQ_Exploration_And_Production"
//     ]
//   },
//   {
//     department: "Communications_And_Branding",
//     subDepartments: [
//       "Communications_And_Branding"
//     ]
//   },
//   {
//     department: "Corporate_Support_Service",
//     subDepartments: [
//       "Corporate_Support_Service"
//     ]
//   },
//   {
//     department: "IDS_And_CI",
//     subDepartments: [
//       "IDS",
//       "IDS_And_CI"
//     ]
//   },
//   {
//     department: "People_And_Strategy",
//     subDepartments: [
//       "People",
//       "People_And_Strategy"
//     ]
//   },
//   {
//     department: "People,_Technology_And_Culture",
//     subDepartments: [
//       "People,_Technology_And_Culture"
//     ]
//   }
// ] as const;




// // -------------------- Auto-Generated Types --------------------

// export type TDepartment = (typeof departments)[number]["department"];
// export type TSubDepartment =
//   (typeof departments)[number]["subDepartments"][number];

// // -------------------- User Type --------------------

// export type TUser = {
//   organizationId: Types.ObjectId;
//   department: TDepartment;
//   subDepartment: TSubDepartment;
//   gender: "male" | "female" | "other";
//   age: "18-24" | "25-34" | "35-44" | "45-54" | "55+";
//   seniorityLevel: "senior" | "manager" | "employee";
//   location: "block60" | "msusundam" | "headOffice";
// };

// // -------------------- Answer / Risk / Model --------------------

// export type TAnswer = {
//   question: Types.ObjectId;
//   answerIndex: number;
//   score: number;
// };

// export type TDomainRisk = {
//   domain: string;
//   riskCount: number;
// };

// export interface ISurveyResponse {
//   organizationId: Types.ObjectId;
//   user: TUser;
//   responses: TAnswer[];
//   questions: Types.ObjectId[];
//   followUpQuestions: Types.ObjectId[];
//   highRiskCount: number;
//   status: "in-progress" | "completed";
//   completedAt?: Date;
//   domainRisks: TDomainRisk[];
// }

// export type SurveyResponseModel = Model<
//   ISurveyResponse,
//   Record<string, unknown>
// >;



import { Model, Types } from "mongoose";

// -------------------- Static Enums --------------------

export const ageRanges = ["18-25", "25-34", "35-44", "44-54"] as const;

export const seniorityLevels = [
  "Senior Management",
  "Manager / Team Lead",
  "Employee / Individual Contributor",
] as const;

export const locations = ["Block 60", "Msusundam", "Head Office"] as const;


// -------------------- Stream → Function → Department --------------------

export const departments = [
  {
    stream: "Commercial",
    functions: [
      {
        function: "Business_Development",
        departments: [
          "Business_Development",
          "Mergers_And_Acquisitions",
        ],
      },
      {
        function: "Commercial",
        departments: [
          "Commercial",
          "Economics_And_Planning",
        ],
      },
      {
        function: "Exploration",
        departments: [
          "Exploration",
          "Exploration_Operated_Assets",
          "Exploration_Study_Or_Growth_Team",
        ],
      },
      {
        function: "Joint_Ventures",
        departments: [
          "Joint_Ventures_Integrated_Gas",
          "Joint_Ventures",
          "Joint_Ventures_Business",
          "Joint_Ventures_Technical_Solution",
        ],
      },
    ],
  },

  {
    stream: "Finance_And_Procurement",
    functions: [
      {
        function: "Contract_And_Procurement",
        departments: [
          "Contract_And_Procurement",
          "Contracts",
          "Material_Management",
        ],
      },
      {
        function: "Finance_And_Procurement",
        departments: [
          "BF_Non_Operated_Assets",
          "BF_Operated_Assets",
          "BF_Operated_Assets_Block_60_And_48",
          "Finance_And_Procurement",
          "Financial_Control",
          "Financial_Planning_And_Analysis",
          "Treasury",
        ],
      },
    ],
  },

  {
    stream: "Legal",
    functions: [
      {
        function: "Legal",
        departments: ["Legal"],
      },
    ],
  },

  {
    stream: "Operated_Assets",
    functions: [
      {
        function: "HSSE",
        departments: [
          "HSE_Operated_Asset",
          "HSE_Support",
          "HSSE",
          "OH_And_IH",
        ],
      },
      {
        function: "Musandam_Cluster",
        departments: ["Musandam_Cluster"],
      },
      {
        function: "Operated_Assets",
        departments: [
          "Operated_Assets",
          "Technical_Services",
          "Well_Delivery",
        ],
      },
      {
        function: "Projects_Delivery",
        departments: [
          "Construction",
          "Engineering",
          "Major_Projects",
          "Off_Plot_Projects",
          "Project_Technical_Services",
          "Projects_Delivery",
        ],
      },
      {
        function: "Subsurface_And_Operation_60_And_48",
        departments: [
          "Budget_And_Cost_Control",
          "Growth_And_Planning",
          "Operation_60_And_48_COE",
          "Subsurface",
          "Subsurface_And_Operation_60_And_48",
        ],
      },
    ],
  },

  {
    stream: "OQ_Exploration_And_Production",
    functions: [
      {
        function: "OQ_Exploration_And_Production",
        departments: ["OQ_Exploration_And_Production"],
      },
    ],
  },

  {
    stream: "People_Technology_And_Culture",
    functions: [
      {
        function: "Communications_And_Branding",
        departments: ["Communications_And_Branding"],
      },
      {
        function: "Corporate_Support_Service",
        departments: ["Corporate_Support_Service"],
      },
      {
        function: "IDS_And_CI",
        departments: ["IDS", "IDS_And_CI"],
      },
      {
        function: "People_And_Strategy",
        departments: ["People", "People_And_Strategy"],
      },
      {
        function: "People_Technology_And_Culture",
        departments: ["People_Technology_And_Culture"],
      },
    ],
  },
] as const;


// -------------------- Auto-Generated Types --------------------

export type TStream = typeof departments[number]["stream"];

export type TFunction =
  typeof departments[number]["functions"][number]["function"];

export type TDepartment =
  typeof departments[number]["functions"][number]["departments"][number];


// -------------------- User Type --------------------

export type TUser = {
  organizationId: Types.ObjectId;

  stream: TStream;
  function: TFunction;
  department: TDepartment;

  gender: "male" | "female" | "other";
  age: "18-24" | "25-34" | "35-44" | "45-54" | "55+";
  seniorityLevel: "senior" | "manager" | "employee";
  location: "block60" | "msusundam" | "headOffice";
};


// -------------------- Answer / Risk / Model --------------------

export type TAnswer = {
  question: Types.ObjectId;
  answerIndex: number;
  score: number;
};

export type TDomainRisk = {
  domain: string;
  riskCount: number;
};

export interface ISurveyResponse {
  organizationId: Types.ObjectId;
  user: TUser;
  responses: TAnswer[];
  questions: Types.ObjectId[];
  followUpQuestions: Types.ObjectId[];
  highRiskCount: number;
  status: "in-progress" | "completed";
  completedAt?: Date;
  domainRisks: TDomainRisk[];
}

export type SurveyResponseModel = Model<ISurveyResponse, Record<string, unknown>>;
