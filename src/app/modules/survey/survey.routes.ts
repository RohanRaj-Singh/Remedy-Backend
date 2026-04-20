

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
import uploader from "../../middlewares/uploader";
import validateAdmin from "../../middlewares/validateAdmin";
import validateOrganization from "../../middlewares/validateOrganization";
// import { validateOrganization } from "../../middlewares/validateOrganization"; // (uncomment if needed)

const router = express.Router();
// Admin-only Excel upload endpoint
router.post(
  "/admin/upload-excel",
  validateOrganization(),
  uploader.single("file"),
  SurveyController.uploadExcel
);

router.post(
  "/admin/send-invitations",
  validateOrganization(),
  SurveyController.sendInvitations
);

router.post(
  "/admin/send-test-email",
  validateOrganization(),
  SurveyController.sendTestEmail
);

// Admin monitoring: email send & completion status per org
router.get(
  "/admin/invite-status",
  validateOrganization(),
  SurveyController.getInviteStatus
);

/**
 * ===========================
 * 🔹 Public Survey Routes
 * ===========================
 */

// Get all surveys result
router.get("/", SurveyController.getAllServeysResult);

// Start a new survey
router.post("/start", SurveyController.startSurvey);

// Start survey from secure email token
router.post("/scanner/start-by-token", SurveyController.startSurveyByToken);

// Validate scanner token and load prefill context
router.get("/scanner/session", SurveyController.getScannerSession);

// Mark invite as completed after survey submit
router.post("/scanner/mark-complete", SurveyController.markScannerCompleted);

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
