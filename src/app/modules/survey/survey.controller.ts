import httpStatus from "http-status";

import { SurveyService } from "./survey.service";
import catchAsync from "../../utils/catch_async";
import sendResponse from "../../utils/sendResponse";
import { Request } from "express";
import { SurveyResponse } from "./survey.model";

export interface AuthenticatedRequest extends Request {
  loggedInUser?: any;
}
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

export const SurveyController = {
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
