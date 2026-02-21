import status from "http-status";
import { AppError } from "../../utils/app_error";
import { ISurveyResponse } from "./../survey/survey.interface";
import { Question } from "./question.interface";
import { questionModel } from "./question.model";

export const questionService = {
  async postQuestionIntoDB(data: Question) {
    console.log("🚀 ~ data:", data);

    const isQuestionExist = await questionModel.findOne({
      question: data.question,
    });
    if (isQuestionExist) {
      throw new AppError("Question already exist", status.CONFLICT);
    }

    const questionLength = await questionModel.countDocuments();
    console.log(questionLength);

    let payload = {
      ...data,
      isInverted: true,
      id: `Q${questionLength + 1}`,
    };
    // console.log("🚀 ~ payload:", payload);

    if (data.dashboardDomain === "Clinical Risk Index") {
      payload.dashboardDomainMaxPossibleScore = 180;
      payload.dashboardDomainWeight = 45;
    } else if (data.dashboardDomain === "Psychological Safety Index") {
      payload.dashboardDomainMaxPossibleScore = 120;
      payload.dashboardDomainWeight = 30;
    } else if (data.dashboardDomain === "Satisfaction & Engagement") {
      payload.dashboardDomainMaxPossibleScore = 60;
      payload.dashboardDomainWeight = 15;
    } else if (data.dashboardDomain === "Workload & Efficiency") {
      payload.dashboardDomainMaxPossibleScore = 48;
      payload.dashboardDomainWeight = 12;
    } else if (data.dashboardDomain === "Leadership & Alignment") {
      payload.dashboardDomainMaxPossibleScore = 36;
      payload.dashboardDomainWeight = 9;
    }

    // console.log(payload)

    const question = await questionModel.create(payload);
    return question;
  },

  async getAllQuestion(query: {
    isFollowUp?: boolean;
    isInverted?: boolean;
    page?: number;
    limit?: number;
  }) {
    const currentPage = query.page && query.page > 0 ? query.page : 1;
    const perPage = query.limit && query.limit > 0 ? query.limit : 10;

    // Filter generate
    let filter: Record<string, any> = { isDeleted: false };

    if (query.isFollowUp !== undefined) {
      filter.isFollowUp = query.isFollowUp;
    }

    if (query.isInverted !== undefined) {
      filter.isInverted = query.isInverted;
    }

    const skip = (currentPage - 1) * perPage;

    // Question fetch
    const questions = await questionModel
      .find(filter)
      .skip(skip)
      .limit(perPage);

    // Counts
    const totalFilteredQuestions = await questionModel.countDocuments(filter);
    const totalNonFollowUpQuestion = await questionModel.countDocuments({
      isFollowUp: false,
      isDeleted: false,
    });
    const totalFollowUpQuestion = await questionModel.countDocuments({
      isFollowUp: true,
      isDeleted: false,
    });
    const totalNonInvertedQuestion = await questionModel.countDocuments({
      isInverted: false,
      isDeleted: false,
    });
    const totalInvertedQuestion = await questionModel.countDocuments({
      isInverted: true,
      isDeleted: false,
    });
    const totalQuestion = await questionModel.countDocuments({
      isDeleted: false,
    });

    return {
      data: {
        questions,
        totalFilteredQuestions,
        totalNonFollowUpQuestion,
        totalFollowUpQuestion,
        totalNonInvertedQuestion,
        totalInvertedQuestion,
        totalQuestion,
      },
      meta: {
        page: Number(currentPage),
        limit: perPage,
        totalFiltered: totalFilteredQuestions,
        totalPages: Math.ceil(totalFilteredQuestions / perPage),
      },
    };
  },

  async getSingleQuestion(id: string) {
    console.log(id);
    const question = await questionModel.findOne({ _id: id, isDeleted: false });

    if (!question) {
      throw new AppError("Question not found.", status.NOT_FOUND);
    }

    return question;
  },

  async updateQuestion(id: string, payload: Question) {
    const normalizedPayload = { ...payload, isInverted: true };
    const question = await questionModel.findOneAndUpdate(
      { _id: id },
      normalizedPayload,
      { new: true }
    );
    return question;
  },
  async deleteQuestion(id: string) {
    await questionModel.findOneAndUpdate({ _id: id }, { isDeleted: true });
  },
};
