import httpStatus from "http-status";
import { Request } from "express";

import catchAsync from "../../utils/catch_async";
import sendResponse from "../../utils/sendResponse";
import { AppError } from "../../utils/app_error";
import { SurveyService } from "./survey.service";
import { SurveyEmailService } from "./surveyEmail.service";

export interface AuthenticatedRequest extends Request {
  loggedInUser?: any;
}

const uploadExcel = catchAsync(async (req: AuthenticatedRequest, res) => {
  if (!req.file?.path) {
    throw new AppError("Excel file is required", httpStatus.BAD_REQUEST);
  }

  const organizationId = req.body.organizationId;

  if (!organizationId) {
    throw new AppError("organizationId is required", httpStatus.BAD_REQUEST);
  }

  const result = await SurveyEmailService.uploadEmployeeExcel({
    organizationId,
    filePath: req.file.path,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Excel import completed",
    data: result,
  });
});

const sendInvitations = catchAsync(async (req: AuthenticatedRequest, res) => {
  const { organizationId, onlyPending = true, limit } = req.body;

  if (!organizationId) {
    throw new AppError("organizationId is required", httpStatus.BAD_REQUEST);
  }

  const result = await SurveyEmailService.sendInvitationEmails({
    organizationId,
    onlyPending,
    limit,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Invitation email job completed",
    data: result,
  });
});

const sendTestEmail = catchAsync(async (req: AuthenticatedRequest, res) => {
  const { toEmail, customLink } = req.body;

  if (!toEmail) {
    throw new AppError("toEmail is required", httpStatus.BAD_REQUEST);
  }

  const result = await SurveyEmailService.sendSecurityTestEmail({
    toEmail,
    customLink,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Test email sent successfully",
    data: result,
  });
});

const getScannerSession = catchAsync(async (req, res) => {
  const token = String(req.query.token || "");
  const result = await SurveyEmailService.getScannerSession(token);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Scanner session fetched successfully",
    data: result,
  });
});

const startSurveyByToken = catchAsync(async (req, res) => {
  const { token, seniorityLevel } = req.body;

  const result = await SurveyEmailService.startSurveyByToken({
    token,
    seniorityLevel,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Survey started successfully",
    data: result,
  });
});

const markScannerCompleted = catchAsync(async (req, res) => {
  const { token, surveyId } = req.body;
  const result = await SurveyEmailService.markInviteCompleted({ token, surveyId });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Completion status updated",
    data: result,
  });
});

const startSurvey = catchAsync(async (req, res) => {
  const result = await SurveyService.startSurvey({ ...req.body });
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Survey started successfully",
    data: result,
  });
});

const submitAnswer = catchAsync(async (req, res) => {
  const { surveyId } = req.params;
  const result = await SurveyService.submitAnswer(surveyId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Answer submitted successfully",
    data: result,
  });
});

const getSurveyResult = catchAsync(async (req, res) => {
  const { surveyId } = req.params;
  const result = await SurveyService.getSurveyResult(surveyId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Survey result fetched successfully",
    data: result,
  });
});
const getAllServeysResult = catchAsync(async (req, res) => {
  const { status, page, limit } = req.query;

  // const {status}= req.query

  const result = await SurveyService.getAllServeysResult(
    status as "completed" | "in-progress"
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Survey result fetched successfully",
    data: result,
  });
});
const getSingleOrganizationServays = catchAsync(
  async (req: AuthenticatedRequest, res) => {
    const { status, page, limit } = req.query;

    const result = await SurveyService.getSingleOrganizationServays(
      // req.loggedInUser._id
      req.loggedInUser._id,
      status as "completed" | "in-progress",
      page as any,
      limit as any
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Survey results fetched successfully",
      data: result,
    });
  }
);

const adminGetServays = catchAsync(async (req: AuthenticatedRequest, res) => {
  const { page, limit } = req.query;

  const result = await SurveyService.adminGetServays(page as any, limit as any);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Survey results fetched successfully",
    data: result,
  });
});

const getOrganizationSurveyStats = catchAsync(
  async (req: AuthenticatedRequest, res) => {
    // console.log("getOrganizationSurveyStats", req.loggedInUser._id);

    const organizationId = req.loggedInUser._id;
    // const { organizationId } = req.params; // Extract organizationId from params

    // // Extract filters from query params
    const filters = {
      stream: req.query.stream as string | undefined,
      function: req.query.function as string | undefined,
      department: req.query.department as string | undefined,
      gender: req.query.gender as "male" | "female" | "other" | undefined,
      age: req.query.age as
        | "18-24"
        | "25-34"
        | "35-44"
        | "45-54"
        | "55+"
        | undefined,
      location: req.query.location as
        | "block60"
        | "msusundam"
        | "headOffice"
        | undefined,
      seniorityLevel: req.query.seniorityLevel as
        | "senior"
        | "manager"
        | "employee"
        | undefined,
    };

    // Call the service function with organizationId and filters
    const result = await SurveyService.getOrganizationSurveyStats2(
      organizationId,
      filters
    );

    // Send the response
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Survey results fetched successfully",
      data: result,
    });
  }
);
const getAdminSurveyStats = catchAsync(async (req, res) => {
  const { organizationId } = req.params; // Extract organizationId from params

  // Extract filters from query params
  const filters = {
    unitDepartment: req.query.unitDepartment as string | undefined,
    gender: req.query.gender as "male" | "female" | "other" | undefined,
    age: req.query.age as
      | "18-24"
      | "25-34"
      | "35-44"
      | "45-54"
      | "55+"
      | undefined,
    location: req.query.location as
      | "block60"
      | "msusundam"
      | "headOffice"
      | undefined,
    seniorityLevel: req.query.seniorityLevel as
      | "senior"
      | "manager"
      | "employee"
      | undefined,
  };

  // Call the service function with organizationId and filters
  const result = await SurveyService.getAdminSurveyStats(filters);

  // Send the response
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Survey results fetched successfully",
    data: result,
  });
});

const getSubdomainSeats = catchAsync(async (req: AuthenticatedRequest, res) => {
  const organizationId = req.loggedInUser._id;
  // ------------------- FILTERS -------------------
  const filters = {
    stream: req.query.stream as string | undefined,
    function: req.query.function as string | undefined,
    department: req.query.department as string | undefined,
    gender: req.query.gender as "male" | "female" | "other" | undefined,
    age: req.query.age as
      | "18-24"
      | "25-34"
      | "35-44"
      | "45-54"
      | "55+"
      | undefined,
    location: req.query.location as
      | "block60"
      | "msusundam"
      | "headOffice"
      | undefined,
    seniorityLevel: req.query.seniorityLevel as
      | "senior"
      | "manager"
      | "employee"
      | undefined,
  };

  // ------------------- CALL SERVICE -------------------
  const result = await SurveyService.getSubdomainSeats2(
    organizationId,
    req.body.dashboardDomain as string,
    filters
  );

  // ------------------- SEND RESPONSE -------------------
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subdomain seats fetched successfully",
    data: result,
  });
});

const getSuperAdminSurveyStats = catchAsync(async (req, res) => {
  const filters = {
    stream: req.query.stream as string | undefined,
    function: req.query.function as string | undefined,
    department: req.query.department as string | undefined,
    gender: req.query.gender as "male" | "female" | "other" | undefined,
    age: req.query.age as
      | "18-24"
      | "25-34"
      | "35-44"
      | "45-54"
      | "55+"
      | undefined,
    location: req.query.location as
      | "block60"
      | "msusundam"
      | "headOffice"
      | undefined,
    seniorityLevel: req.query.seniorityLevel as
      | "senior"
      | "manager"
      | "employee"
      | undefined,
  };
  // console.log('getSuperAdminSurveyStats')
  const result = await SurveyService.getSuperAdminServaySeats(filters);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Servay seats fetched successfully",
    data: result,
  });
});

const getSuperAdminSubdomainSeats = catchAsync(
  async (req: AuthenticatedRequest, res) => {
    const organizationId = req.loggedInUser._id;

    // ------------------- FILTERS -------------------
    const filters = {
      unitDepartment: req.query.unitDepartment as string | undefined,
      gender: req.query.gender as "male" | "female" | "other" | undefined,
      age: req.query.age as
        | "18-24"
        | "25-34"
        | "35-44"
        | "45-54"
        | "55+"
        | undefined,
      location: req.query.location as
        | "block60"
        | "msusundam"
        | "headOffice"
        | undefined,
      seniorityLevel: req.query.seniorityLevel as
        | "senior"
        | "manager"
        | "employee"
        | undefined,
    };

    // ------------------- CALL SERVICE -------------------
    const result = await SurveyService.getSuperAdminSubdomainSeats(filters);

    // ------------------- SEND RESPONSE -------------------
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Subdomain seats fetched successfully",
      data: result,
    });
  }
);

const getSuperAdminOrganizationServays = catchAsync(
  async (req: AuthenticatedRequest, res) => {
    // ------------------- CALL SERVICE -------------------
    const result = await SurveyService.getSuperAdminOrganizationServays();

    // ------------------- SEND RESPONSE -------------------
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Result fetched successfully",
      data: result,
    });
  }
);

const getSuperAdminAllSurveyResult = catchAsync(
  async (req: AuthenticatedRequest, res) => {
    // ------------------- CALL SERVICE -------------------
    const result = await SurveyService.getSuperAdminAllSurveyResult();

    // ------------------- SEND RESPONSE -------------------
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Result fetched successfully",
      data: result,
    });
  }
);

const getInviteStatus = catchAsync(async (req: AuthenticatedRequest, res) => {
  const organizationId = String(req.query.organizationId || "");

  if (!organizationId) {
    throw new AppError("organizationId is required", httpStatus.BAD_REQUEST);
  }

  const result = await SurveyEmailService.getInviteStatusReport({ organizationId });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Invite status report fetched",
    data: result,
  });
});

export const SurveyController = {
  uploadExcel,
  sendInvitations,
  sendTestEmail,
  getScannerSession,
  startSurveyByToken,
  markScannerCompleted,
  getInviteStatus,
  startSurvey,
  submitAnswer,
  getSurveyResult,
  getAllServeysResult,
  getSingleOrganizationServays,
  getOrganizationSurveyStats,

  getAdminSurveyStats,
  adminGetServays,
  getSubdomainSeats,
  getSuperAdminSurveyStats,
  getSuperAdminSubdomainSeats,
  getSuperAdminOrganizationServays,
  getSuperAdminAllSurveyResult,
};
