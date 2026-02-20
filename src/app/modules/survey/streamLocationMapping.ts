export type StreamLocationMapping = Record<string, Record<string, Record<string, string[]>>>;

export const streamLocationMapping: StreamLocationMapping = {
    "Commercial":  {
                       "headOffice":  {
                                          "Business_Development":  [
                                                                       "Business_Development",
                                                                       "Mergers_And_Acquisitions"
                                                                   ],
                                          "Commercial":  [
                                                             "Commercial",
                                                             "Economics_And_Planning"
                                                         ],
                                          "Exploration":  [
                                                              "Exploration",
                                                              "Exploration_Operated_Assets",
                                                              "Exploration_Study_Or_Growth_Team"
                                                          ],
                                          "Joint_Ventures":  [
                                                                 "Joint_Ventuers_Integrated_Gas",
                                                                 "Joint_Ventures",
                                                                 "Joint_Ventures_Business",
                                                                 "Joint_Ventures_Technical_Soultion"
                                                             ]
                                      }
                   },
    "Finance_And_Procurement":  {
                                    "headOffice":  {
                                                       "Contract_And_Procurement":  [
                                                                                        "Contract_And_Procurement",
                                                                                        "Contracts"
                                                                                    ],
                                                       "Finance_And_Procurement":  [
                                                                                       "BF_Non_Operated_Assets",
                                                                                       "BF_Operated_Assets",
                                                                                       "BF_Operated_Assets_Block_60_And_48",
                                                                                       "Finance_And_Procurement",
                                                                                       "Financial_Control",
                                                                                       "Financial_Planning_And_Analysis",
                                                                                       "Treasury"
                                                                                   ]
                                                   },
                                    "block60":  {
                                                    "Contract_And_Procurement":  [
                                                                                     "Material_Management"
                                                                                 ]
                                                }
                                },
    "Legal":  {
                  "headOffice":  {
                                     "Legal":  [
                                                   "Legal"
                                               ]
                                 }
              },
    "Operated_Assets":  {
                            "block60":  {
                                            "HSSE":  [
                                                         "HSE_Operated_Asset"
                                                     ],
                                            "Projects_Delivery":  [
                                                                      "Engineering",
                                                                      "Project_Technical_Services"
                                                                  ],
                                            "Subsurface_And_Operation_60_And_48":  [
                                                                                       "Operation_60_And_48_COE",
                                                                                       "Subsurface",
                                                                                       "Subsurface_And_Operation_60_And_48"
                                                                                   ]
                                        },
                            "msusundam":  {
                                              "HSSE":  [
                                                           "HSE_Operated_Asset"
                                                       ],
                                              "Musandam_Cluster":  [
                                                                       "Musandam_Cluster"
                                                                   ],
                                              "Subsurface_And_Operation_60_And_48":  [
                                                                                         "Subsurface_And_Operation_60_And_48"
                                                                                     ]
                                          },
                            "headOffice":  {
                                               "HSSE":  [
                                                            "HSE_Support",
                                                            "HSSE",
                                                            "OH_And_IH"
                                                        ],
                                               "Operated_Assets":  [
                                                                       "Operated_Assets",
                                                                       "Technical_Services",
                                                                       "Well_Delivery"
                                                                   ],
                                               "Projects_Delivery":  [
                                                                         "Construction",
                                                                         "Major_Projects",
                                                                         "Off_Plot_Projects",
                                                                         "Projects_Delivery"
                                                                     ],
                                               "Subsurface_And_Operation_60_And_48":  [
                                                                                          "Budget_And_Cost_Control",
                                                                                          "Growth_And_Planning"
                                                                                      ]
                                           }
                        },
    "OQ_Exploration_And_Production":  {
                                          "headOffice":  {
                                                             "OQ_Exploration_And_Production":  [
                                                                                                   "OQ_Exploration_And_Production"
                                                                                               ]
                                                         }
                                      },
    "People_Technology_And_Culture":  {
                                          "headOffice":  {
                                                             "Communications_And_Branding":  [
                                                                                                 "Communications_And_Branding"
                                                                                             ],
                                                             "Corporate_Support_Service":  [
                                                                                               "Corporate_Support_Service"
                                                                                           ],
                                                             "IDS_And_CI":  [
                                                                                "IDS",
                                                                                "IDS_And_CI"
                                                                            ],
                                                             "People_And_Strategy":  [
                                                                                         "People",
                                                                                         "People_And_Strategy"
                                                                                     ],
                                                             "People_Technology_And_Culture":  [
                                                                                                   "People_Technology_And_Culture"
                                                                                               ]
                                                         },
                                          "block60":  {
                                                          "Corporate_Support_Service":  [
                                                                                            "Corporate_Support_Service"
                                                                                        ],
                                                          "IDS_And_CI":  [
                                                                             "IDS",
                                                                             "IDS_And_CI"
                                                                         ]
                                                      },
                                          "msusundam":  {
                                                            "Corporate_Support_Service":  [
                                                                                              "Corporate_Support_Service"
                                                                                          ],
                                                            "IDS_And_CI":  [
                                                                               "IDS",
                                                                               "IDS_And_CI"
                                                                           ]
                                                        }
                                      }
};
