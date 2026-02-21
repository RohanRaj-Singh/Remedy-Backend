import express from "express";
import { questionController } from "./question.controller";
import validateRequest from "../../middlewares/validateSchema";
import { createQuestionZodSchema } from "./question.validation";

const router = express.Router();

router.get("/", questionController.getAllQuestion);
router.get("/:id", questionController.getSingleQuestion);
router.post(
  "/add-question",
  validateRequest(createQuestionZodSchema),
  questionController.postQuestion
);
router.patch("/:id", questionController.updateQuestion);
router.delete("/:id", questionController.deleteQuestion);

export const questionRoutes = router;
