import  httpStatus from 'http-status';
import catchAsync from "../../utils/catch_async";
import sendResponse from "../../utils/sendResponse";
import { UserService } from "./user.service";

const loginSuperAdmin = catchAsync(async (req, res) => {
  const result = await UserService.loginSuperAdmin(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Super Admin Login Successfully",
    data: result,
  });
});

export const userController = { loginSuperAdmin };