import { Request, Response } from "express";
import { organizationService } from "./organization.service";
import catchAsync from "../../utils/catch_async";
import sendResponse from "../../utils/sendResponse";
import status from "http-status";

const postOrganization = catchAsync(async (req: Request, res: Response) => {
  const result = await organizationService.postOrganizationIntoDB(req.body);
  sendResponse(res, { statusCode: status.CREATED, success: true, message: "Created successfully", data: result });
});

const loginOrganization = catchAsync(async (req: Request, res: Response) => {
  const result = await organizationService.loginOrganization(req.body);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Logged in successfully", data: result });
});

const loginEmailInvitationsAccess = catchAsync(async (req: Request, res: Response) => {
  const result = await organizationService.loginEmailInvitationsAccess(req.body);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Email invitations access granted",
    data: result,
  });
});

const changeEmailInvitationsPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await organizationService.changeEmailInvitationsPassword(
    (req as any).loggedInUser._id,
    req.body
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Email invitations password changed",
    data: result,
  });
});

const getAllOrganization = catchAsync(async (req: Request, res: Response) => {
  const result = await organizationService.getAllOrganizationFromDB(req.query);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Fetched successfully", data: result });
});

const getSingleOrganization = catchAsync(async (req: Request, res: Response) => {
  const result = await organizationService.getSingleOrganizationFromDB(req.params.id);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Fetched successfully", data: result });
});

const updateOrganization = catchAsync(async (req: Request, res: Response) => {
  const result = await organizationService.updateOrganizationIntoDB(req.body);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Updated successfully", data: result });
});

const deleteOrganization = catchAsync(async (req: Request, res: Response) => {
  await organizationService.deleteOrganizationFromDB(req.params.id);
  sendResponse(res, { statusCode: status.OK, success: true, message: "Deleted successfully",data: null });
});


export const organizationController = {
  postOrganization,
  getAllOrganization,
  getSingleOrganization,
  updateOrganization,
  deleteOrganization,
  loginOrganization,
  loginEmailInvitationsAccess,
  changeEmailInvitationsPassword,
};
    