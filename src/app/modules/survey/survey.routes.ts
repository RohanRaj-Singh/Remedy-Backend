

// import express from "express";
// import { SurveyController } from "./survey.controller";

// const router = express.Router();

// router.get("/", SurveyController.getAllServeysResult);

// router.post("/start", SurveyController.startSurvey);

// // router.get(
// //   "/get-single-organization-servays",
// //   validateOrganization(),
// //   SurveyController.getSingleOrganizationServays
// // );
// router.get(
//   "/organization/:organizationId",
//   // validateOrganization(),
//   SurveyController.getSingleOrganizationServays
// );

// router.get(
//   "/organization/:organizationId/stats",
//   // validateOrganization(),
//   SurveyController.getOrganizationSurveyStats
// );

// router.get('/admin/get-all-survey-stats', SurveyController.getAdminSurveyStats);
// router.get('/admin/get-all-survey', SurveyController.adminGetServays);
// router.post("/:surveyId/submit", SurveyController.submitAnswer);

// router.get("/:surveyId/result", SurveyController.getSurveyResult);

// export const SurveyRoutes = router;



import express from "express";
import { SurveyController } from "./survey.controller";
import validateOrganization from "../../middlewares/validateOrganization";
import validateAdmin from "../../middlewares/validateAdmin";
// import { validateOrganization } from "../../middlewares/validateOrganization"; // (uncomment if needed)

const router = express.Router();

/**
 * ===========================
 * 🔹 Public Survey Routes
 * ===========================
 */

// Get all surveys result
router.get("/", SurveyController.getAllServeysResult);

// Start a new survey
router.post("/start", SurveyController.startSurvey);

// Submit survey answers
router.post("/:surveyId/submit", SurveyController.submitAnswer);

// Get result of a specific survey
router.get("/:surveyId/result", SurveyController.getSurveyResult);


/**
 * ===========================
 * 🔹 Organization-based Routes
 * ===========================
 */

// Get all surveys of a specific organization
router.get(
  "/organization/get-single-organization-servays",
  validateOrganization(),
  SurveyController.getSingleOrganizationServays
);

// Get organization-level survey statistics
router.get(
  "/organization/stats",
  validateOrganization(),
  SurveyController.getOrganizationSurveyStats
);


/**
 * ===========================
 * 🔹 Admin Routes
 * ===========================
 */

// Get all survey statistics for admin
router.get(
  "/admin/get-all-survey-stats",
  SurveyController.getAdminSurveyStats
);

// Get all surveys (admin)
router.get(
  "/admin/get-all-survey",
  SurveyController.getAllServeysResult
);

router.get('/super-admin/get-servay-seats',validateAdmin(), SurveyController.getSuperAdminSurveyStats);

router.get('/super-admin/get-subdomain-seats',validateAdmin(), SurveyController.getSuperAdminSubdomainSeats);

router.get('/super-admin/get-organization-survays',validateAdmin(), SurveyController.getSuperAdminOrganizationServays);

router.get("/super-admin/get-all-survey-statics", SurveyController.getAllServeysResult);

router.get("/super-admin/get-all-survey-result", SurveyController.getSuperAdminAllSurveyResult);

router.post('/subdomain-seats', validateOrganization(), SurveyController.getSubdomainSeats);

export const SurveyRoutes = router;
