export type StreamLocationMapping = Record<string, Record<string, Record<string, string[]>>>;

export const streamLocationMapping: StreamLocationMapping = {
    "Commercial": {
        "headOffice": {
            "Business_Development": [
                "Business_Development",
                "Mergers_And_Acquisitions"
            ],
            "Commercial": [
                "Commercial",
                "Economics_And_Planning",
                "Investment_Valuations_And_Strategy"
            ],
            "Exploration": [
                "Exploration",
                "Exploration_Operated_Assets",
                "Exploration_Study_Or_Growth_Team",
                "Exploration_B48_And_B60",
                "B54_Exploration",
                "Growth_Ventures"
            ],
            "Joint_Ventures": [
                "Joint_Ventures_Integrated_Gas",
                "Joint_Ventures",
                "Joint_Ventures_Business",
                "Joint_Ventures_Technical_Solution",
                "Joint_Ventuers_Integrated_Gas",
                "Joint_Ventures_Oil"
            ]
        }
    },
    "Finance_And_Procurement": {
        "headOffice": {
            "Contract_And_Procurement": [
                "Contract_And_Procurement",
                "Contracts",
                "Material_Management"
            ],
            "Finance_And_Procurement": [
                "BF_Non_Operated_Assets",
                "BF_Operated_Assets",
                "BF_Operated_Assets_Block_60_And_48",
                "Finance_And_Procurement",
                "Financial_Control",
                "Financial_Planning_And_Analysis",
                "Treasury"
            ],
            "Finance": [
                "Financial_Control",
                "BF_Operated_Assets",
                "Financial_Planning_And_Analysis",
                "Treasury",
                "Finance",
                "BF_Non_Operated_Assets",
                "Corporate_Planning"
            ]
        },
        "block60": {
            "Contract_And_Procurement": [
                "Material_Management"
            ]
        },
        "msusundam": {
            "Contract_And_Procurement": [
                "Material_Management"
            ]
        },
        "Abu Al Tubul": {
            "Contract_And_Procurement": [
                "Material_Management"
            ]
        }
    },
    "Legal": {
        "headOffice": {
            "Legal": [
                "Legal"
            ]
        }
    },
    "Operated_Assets": {
        "block60": {
            "HSSE": [
                "HSE_Operated_Asset"
            ],
            "Projects_Delivery": [
                "Engineering",
                "Project_Technical_Services"
            ],
            "Subsurface_And_Operation_60_And_48": [
                "Operation_60_And_48_COE",
                "Subsurface",
                "Subsurface_And_Operation_60_And_48"
            ]
        },
        "msusundam": {
            "HSSE": [
                "HSE_Operated_Asset",
                "HSSE"
            ],
            "Musandam_Cluster": [
                "Musandam_Cluster"
            ],
            "Subsurface_And_Operation_60_And_48": [
                "Subsurface_And_Operation_60_And_48"
            ],
            "Operated_Assets": [
                "Technical_Services"
            ]
        },
        "headOffice": {
            "HSSE": [
                "HSE_Support",
                "HSSE",
                "OH_And_IH",
                "HSE_Operated_Asset"
            ],
            "Operated_Assets": [
                "Operated_Assets",
                "Technical_Services",
                "Well_Delivery"
            ],
            "Projects_Delivery": [
                "Construction",
                "Major_Projects",
                "Off_Plot_Projects",
                "Projects_Delivery"
            ],
            "Subsurface_And_Operation_60_And_48": [
                "Budget_And_Cost_Control",
                "Growth_And_Planning",
                "Operation_60_And_48_COE",
                "Subsurface",
                "Subsurface_And_Operation_60_And_48"
            ]
        },
        "Abu Al Tubul": {
            "Subsurface_And_Operation_60_And_48": [
                "Operation_60_And_48_COE",
                "Subsurface"
            ],
            "HSSE": [
                "HSE_Operated_Asset",
                "HSSE",
                "HSE_Support"
            ],
            "Operated_Assets": [
                "Technical_Services",
                "Well_Delivery"
            ]
        }
    },
    "OQ_Exploration_And_Production": {
        "headOffice": {
            "OQ_Exploration_And_Production": [
                "OQ_Exploration_And_Production"
            ],
            "Internal_Audit": [
                "Internal_Audit"
            ]
        }
    },
    "People_Technology_And_Culture": {
        "headOffice": {
            "Communications_And_Branding": [
                "Communications_And_Branding"
            ],
            "Corporate_Support_Service": [
                "Corporate_Support_Service"
            ],
            "IDS_And_CI": [
                "IDS",
                "IDS_And_CI",
                "Continuous_Improvement",
                "Digital_Solutions"
            ],
            "People_And_Strategy": [
                "People",
                "People_And_Strategy"
            ],
            "People_Technology_And_Culture": [
                "People_Technology_And_Culture",
                "External_Relations_And_CSI",
                "Corporate_Support_Service",
                "Communications_And_Branding"
            ],
            "People_And_Culture": [
                "People",
                "People_And_Culture"
            ]
        },
        "block60": {
            "Corporate_Support_Service": [
                "Corporate_Support_Service"
            ],
            "IDS_And_CI": [
                "IDS",
                "IDS_And_CI"
            ]
        },
        "msusundam": {
            "Corporate_Support_Service": [
                "Corporate_Support_Service"
            ],
            "IDS_And_CI": [
                "IDS",
                "IDS_And_CI",
                "Digital_Solutions"
            ],
            "People_And_Culture": [
                "People"
            ],
            "People_Technology_And_Culture": [
                "Corporate_Support_Service"
            ]
        },
        "Abu Al Tubul": {
            "People_Technology_And_Culture": [
                "Corporate_Support_Service"
            ],
            "IDS_And_CI": [
                "Digital_Solutions"
            ]
        }
    },
    "Business_Development": {
        "headOffice": {
            "Business_Development": [
                "Business_Development",
                "Mergers_And_Acquisitions_International"
            ]
        }
    },
    "Musandam_Cluster": {
        "msusundam": {
            "Musandam_Cluster": [
                "Musandam_Cluster_Operations"
            ]
        },
        "headOffice": {
            "Musandam_Cluster": [
                "Musandam_Cluster",
                "Musandam_Cluster_Operations"
            ]
        }
    },
    "Projects_Delivery": {
        "headOffice": {
            "Projects_Delivery": [
                "Major_Projects",
                "Project_Technical_Services",
                "Off_Plot_Projects",
                "Engineering",
                "Construction"
            ]
        },
        "Abu Al Tubul": {
            "Projects_Delivery": [
                "Construction",
                "Project_Technical_Services",
                "Engineering",
                "Major_Projects"
            ]
        }
    }
};
