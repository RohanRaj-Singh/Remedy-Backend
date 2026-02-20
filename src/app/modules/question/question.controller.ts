import { Request, Response } from "express";
import { questionService } from "./question.service";
import catchAsync from "../../utils/catch_async";
import sendResponse from "../../utils/sendResponse";
import status from "http-status";

const postQuestion = catchAsync(async (req: Request, res: Response) => {
  const result = await questionService.postQuestionIntoDB(req.body);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Question Added successfully",
    data: result,
  });
});

const getAllQuestion = catchAsync(async (req: Request, res: Response) => {
  const result = await questionService.getAllQuestion(req.query);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Question fetched successfully",
    data: result,
  });
});

const getSingleQuestion = catchAsync(async (req: Request, res: Response) => {
  console.log(req.params);
  const result = await questionService.getSingleQuestion(req.params.id);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Question fetched successfully",
    data: result,
  });
});

const updateQuestion = catchAsync(async (req: Request, res: Response) => {
  const result = await questionService.updateQuestion(req.params.id, req.body);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Question updated successfully",
    data: result,
  });
});
const deleteQuestion = catchAsync(async (req: Request, res: Response) => {
  await questionService.deleteQuestion(req.params.id);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Question updated successfully",
    data: null,
  });
});

export const questionController = {
  postQuestion,
  getAllQuestion,
  getSingleQuestion,
  updateQuestion,
  deleteQuestion
};
