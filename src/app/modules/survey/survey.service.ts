import { questionModel } from "./../question/question.model";
import httpStatus from "http-status";

import { TUser } from "./survey.interface";
import { SurveyResponse } from "./survey.model";
import { AppError } from "../../utils/app_error";
import { organizationModel } from "../organization/organization.model";
import { Types } from "mongoose";
// import { streamLocationMapping } from "./streamLocationMapping";

const DASHBOARD_DOMAINS = [
  "Clinical Risk Index",
  "Psychological Safety Index",
  "Workload & Efficiency",
  "Leadership & Alignment",
  "Satisfaction & Engagement",
] as const;

const ANSWER_INDEX_SCORES = [-2, -1, 1, 2] as const;

const scoreFromAnswerIndex = (answerIndex: number) => {
  const score = ANSWER_INDEX_SCORES[answerIndex as 0 | 1 | 2 | 3];
  if (score === undefined) {
    throw new AppError(
      "Invalid answerIndex. Must be 0..3.",
      httpStatus.BAD_REQUEST
    );
  }
  return score;
};

const effectiveScore = (answerIndex: number, existingScore: unknown) => {
  if (typeof existingScore === "number" && existingScore !== 0)
    return existingScore;
  return scoreFromAnswerIndex(answerIndex);
};

const normalizeId = (value: any) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value?._id) return value._id.toString();
  return value.toString();
};

const riskFractionFromScore = (score: number) => {
  return (2 - score) / 4;
};

const toLegacyLabel = (value: string) => {
  let out = value.replace(/_/g, " ");
  out = out.replace(/\bAnd\b/g, "&");
  out = out.replace(/\bOr\b/g, "/");
  out = out.replace(/60 & 48/g, "60&48");
  out = out.replace(/People Technology & Culture/g, "People, Technology & Culture");
  return out;
};

const toCanonicalLabel = (value: string) => {
  return value
    .trim()
    .replace(/&/g, " And ")
    .replace(/\//g, " Or ")
    .replace(/,/g, " ")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ /g, "_");
};

const locationAliases: Record<string, string[]> = {
  headOffice: ["Muscat", "muscat", "Head Office", "head office"],
  block60: ["B60", "b60", "Block 60", "block 60"],
  msusundam: ["Musandam", "musandam", "Msusundam", "msusundam"],
};

const getFilterCandidates = (value?: string) => {
  if (!value) return [];
  const set = new Set<string>([
    value,
    toLegacyLabel(value),
    toCanonicalLabel(value),
    value.toLowerCase(),
    toLegacyLabel(value).toLowerCase(),
  ]);

  const aliases = locationAliases[value];
  if (aliases) aliases.forEach((a) => set.add(a));

  return Array.from(set).filter(Boolean);
};

const buildFieldFilter = (field: string, value?: string) => {
  const candidates = getFilterCandidates(value);
  if (!candidates.length) return null;
  return { [field]: { $in: candidates } };
};

const startSurvey = async (payload: TUser) => {
  // console.log({ payload });
  // --- Frontend already strictly validates the combination ---
  // const availableDepartments =
  //   streamLocationMapping[payload.stream]?.[payload.location]?.[
  //     payload.function
  //   ] || [];
  //
  // if (!availableDepartments.includes(payload.department)) {
  //   throw new AppError(
  //     "Invalid stream/location/function/department combination",
  //     httpStatus.BAD_REQUEST
  //   );
  // }

  let isOrganizationExist = await organizationModel.findById(
    payload.organizationId
  );

  // Auto-recovery: If the hardcoded ID isn't found (due to a database mismatch),
  // automatically grab the first available organization in the active database.
  if (!isOrganizationExist) {
    isOrganizationExist = await organizationModel.findOne();
    if (isOrganizationExist) {
      payload.organizationId = isOrganizationExist._id.toString();
    }
  }

  if (!isOrganizationExist) {
    throw new AppError("Organization not found", httpStatus.NOT_FOUND);
  }

  await questionModel.updateMany(
    { isDeleted: { $ne: true }, isInverted: { $ne: true } },
    { $set: { isInverted: true } }
  );

  // Fetch all non-follow-up questions for all domains
  const questions = await questionModel
    .find({
      isDeleted: { $ne: true },
      isFollowUp: false,
      dashboardDomain: { $in: DASHBOARD_DOMAINS },
    })
    .sort({ id: 1 });

  if (questions.length === 0) {
    throw new AppError(
      "No questions found for any domain.",
      httpStatus.INTERNAL_SERVER_ERROR
    );
  }

  const surveyData = {
    organizationId: payload.organizationId,
    user: payload,
    questions: questions.map((q) => q._id),
    followUpQuestions: [],
    responses: [],
    domainRisks: DASHBOARD_DOMAINS.map((domain) => ({ domain, riskCount: 0 })),
    status: "in-progress",
  };

  const survey = await SurveyResponse.create(surveyData);

  return {
    survey,
    nextQuestion: questions[0],
  };
};

// ===== submitAnswer =====
const submitAnswer = async (
  surveyId: string,
  payload: { questionId: string; answerIndex: number }
) => {
  const { questionId, answerIndex } = payload;

  const survey = await SurveyResponse.findById(surveyId).populate(
    "questions followUpQuestions"
  );

  if (!survey) {
    throw new AppError("Survey not found.", httpStatus.NOT_FOUND);
  }
  if (survey.status === "completed") {
    throw new AppError(
      "This survey has already been completed.",
      httpStatus.BAD_REQUEST
    );
  }

  const question = await questionModel.findById(questionId);

  if (!question) {
    throw new AppError("Question not found.", httpStatus.NOT_FOUND);
  }

  const existingIndex = survey.responses.findIndex(
    (res: any) => res.question.toString() === questionId
  );

  const score = scoreFromAnswerIndex(answerIndex);

  if (existingIndex >= 0) {
    survey.responses[existingIndex].answerIndex = answerIndex as any;
    survey.responses[existingIndex].score = score as any;
  } else {
    survey.responses.push({ question: questionId as any, answerIndex, score });
  }

  const responseQuestionIds = survey.responses.map((r: any) => r.question);
  const questionDocs = await questionModel
    .find({ _id: { $in: responseQuestionIds } })
    .select("_id dashboardDomain isFollowUp weight dashboardDomainWeight")
    .lean();
  const questionById = new Map<string, any>(
    questionDocs.map((q) => [q._id.toString(), q])
  );

  const domainRiskCounts = new Map<string, number>();
  DASHBOARD_DOMAINS.forEach((d) => domainRiskCounts.set(d, 0));

  let highRiskCount = 0;
  survey.responses.forEach((r: any) => {
    const q = questionById.get(r.question.toString());
    if (!q) return;
    if (q.isFollowUp) return;
    if (!domainRiskCounts.has(q.dashboardDomain)) return;
    if (r.answerIndex === 0 || r.answerIndex === 1) {
      domainRiskCounts.set(
        q.dashboardDomain,
        (domainRiskCounts.get(q.dashboardDomain) || 0) + 1
      );
      highRiskCount += 1;
    }
  });

  survey.domainRisks = DASHBOARD_DOMAINS.map((domain) => ({
    domain,
    riskCount: domainRiskCounts.get(domain) || 0,
  })) as any;
  survey.highRiskCount = highRiskCount as any;

  let nextQuestion = null;

  const answeredIds = new Set(
    survey.responses.map((r: any) => r.question.toString())
  );
  const nextMain = (survey.questions || []).find((q: any) => {
    const id = normalizeId(q);
    return id && !answeredIds.has(id);
  });

  if (nextMain) {
    nextQuestion = await questionModel.findById(normalizeId(nextMain));
  } else {
    const riskyDomains = (survey.domainRisks || [])
      .filter((dr: any) => dr.riskCount >= 2)
      .map((dr: any) => dr.domain);

    if (riskyDomains.length > 0) {
      const followUps = await questionModel
        .find({
          isFollowUp: true,
          dashboardDomain: { $in: riskyDomains },
        })
        .sort({ id: 1 });

      survey.followUpQuestions = followUps.map((q) => q._id) as any;

      const nextFollowUp = followUps.find(
        (q) => !answeredIds.has(q._id.toString())
      );

      if (nextFollowUp) {
        nextQuestion = nextFollowUp;
      } else {
        survey.status = "completed";
        survey.completedAt = new Date();
      }
    } else {
      survey.followUpQuestions = [] as any;
      survey.status = "completed";
      survey.completedAt = new Date();
    }
  }

  await survey.save();

  return {
    survey,
    nextQuestion,
  };
};

const getSurveyResult = async (surveyId: string) => {
  const survey = await SurveyResponse.findById(surveyId)
    .populate("questions")
    .populate("followUpQuestions")
    .populate("responses.question");

  if (!survey) {
    throw new AppError("Survey not found", httpStatus.NOT_FOUND);
  }

  if (survey.status !== "completed") {
    throw new AppError("Survey not completed", httpStatus.BAD_REQUEST);
  }

  const domainResults: { [key: string]: any } = {};

  for (let i = 0; i < DASHBOARD_DOMAINS.length; i++) {
    const dashboardDomain = DASHBOARD_DOMAINS[i];

    const domainResponses = survey.responses.filter((res: any) => {
      const q = res.question as any;
      return q?.dashboardDomain === dashboardDomain && q?.isFollowUp !== true;
    });

    let totalWeight = 0;
    let totalRiskWeight = 0;

    domainResponses.forEach((res: any) => {
      const q = res.question as any;
      const weight = Number(q?.weight) || 0;
      const score = effectiveScore(res.answerIndex, res.score);
      const riskFraction = riskFractionFromScore(score);

      totalWeight += weight;
      totalRiskWeight += weight * riskFraction;
    });

    const riskPercent =
      totalWeight > 0 ? (totalRiskWeight / totalWeight) * 100 : 0;
    const healthyFraction = 1 - riskPercent / 100;

    const domainRisk = survey.domainRisks.find(
      (dr: any) => dr.domain === dashboardDomain
    );

    domainResults[dashboardDomain] = {
      riskCount: domainRisk ? domainRisk.riskCount : 0,
      totalWRS: totalRiskWeight,
      domainScore: riskPercent.toFixed(4),
      healthyScore: Number(healthyFraction.toFixed(4)),
      responses: domainResponses,
    };
  }

  return {
    survey,
    domainResults,
  };
};

const getAllServeysResult = async (status?: "completed" | "in-progress") => {
  // console.log('........')
  // const currentPage = page && page > 0 ? page : 1;
  // const perPage = limit && limit > 0 ? limit : 10;

  let filter: Record<string, any> = {};
  if (status) {
    filter.status = status;
  }

  // const skip = (currentPage - 1) * perPage;

  const surveysQuery = SurveyResponse.find(filter).select(
    "user highRiskCount status organizationId"
  );
  // .skip(skip)
  // .limit(perPage);

  const [
    surveys,
    totalFilteredSurveys,
    totalCompletedSurveys,
    totalIncompletedSurveys,
    totalSurverys,
    completedSurveys,
  ] = await Promise.all([
    surveysQuery,
    SurveyResponse.countDocuments(filter),
    SurveyResponse.countDocuments({ status: "completed" }),
    SurveyResponse.countDocuments({ status: "in-progress" }),
    SurveyResponse.countDocuments(),
    SurveyResponse.find({ status: "completed" }).select("highRiskCount"),
  ]);

  let avgHighRiskCount = 0;
  if (completedSurveys.length > 0) {
    const totalHighRiskCount = completedSurveys.reduce(
      (acc, survey) => acc + (survey.highRiskCount || 0),
      0
    );
    avgHighRiskCount = totalHighRiskCount / completedSurveys.length;
  }

  const domainStats = await SurveyResponse.aggregate([
    { $unwind: "$domainRisks" },
    {
      $group: {
        _id: "$domainRisks.domain",
        totalRiskCount: { $sum: "$domainRisks.riskCount" },
      },
    },
  ]);

  const riskySurveysCount = await SurveyResponse.countDocuments({
    "domainRisks.riskCount": { $gte: 2 },
  });

  return {
    data: {
      surveys,
      statistics: {
        totalSurverys,
        totalCompletedSurveys,
        totalIncompletedSurveys,
        avgHighRiskCount,
        domainStats,
        riskySurveysCount,
      },
    },
    // meta: {
    //   // page: currentPage,
    //   // limit: perPage,
    //   totalFiltered: totalFilteredSurveys,
    //   // totalPages: Math.ceil(totalFilteredSurveys / perPage),
    // },
  };
};
const getSingleOrganizationServays = async (
  organizationId?: string,
  status?: "completed" | "in-progress",
  page?: number,
  limit?: number
) => {
  // Default pagination setup
  // const currentPage = page && page > 0 ? page : 1;
  // const perPage = limit && limit > 0 ? limit : 10;
  // const skip = (currentPage - 1) * perPage;

  // Base filter for organization
  const filter: Record<string, any> = {};
  if (organizationId) {
    filter["user.organizationId"] = organizationId;
  }
  if (status) {
    filter.status = status;
  }

  // Main query
  const surveysQuery = SurveyResponse.find(filter).select(
    "user highRiskCount status organizationId domainRisks"
  );
  // .skip(skip)
  // .limit(perPage);

  const [
    surveys,
    totalFilteredSurveys,
    totalCompletedSurveys,
    totalIncompletedSurveys,
    totalSurveys,
    completedSurveys,
  ] = await Promise.all([
    surveysQuery,
    SurveyResponse.countDocuments(filter),
    SurveyResponse.countDocuments({
      "user.organizationId": organizationId,
      status: "completed",
    }),
    SurveyResponse.countDocuments({
      "user.organizationId": organizationId,
      status: "in-progress",
    }),
    SurveyResponse.countDocuments({
      "user.organizationId": organizationId,
    }),
    SurveyResponse.find({
      "user.organizationId": organizationId,
      status: "completed",
    }).select("highRiskCount"),
  ]);

  // Average high risk count
  let avgHighRiskCount = 0;
  if (completedSurveys.length > 0) {
    const totalHighRiskCount = completedSurveys.reduce(
      (acc, survey) => acc + (survey.highRiskCount || 0),
      0
    );
    avgHighRiskCount = totalHighRiskCount / completedSurveys.length;
  }

  // Domain-wise risk stats
  const domainStats = await SurveyResponse.aggregate([
    { $match: { "user.organizationId": new Types.ObjectId(organizationId) } },
    { $unwind: "$domainRisks" },
    {
      $group: {
        _id: "$domainRisks.domain",
        totalRiskCount: { $sum: "$domainRisks.riskCount" },
      },
    },
  ]);

  // Count risky surveys (যেগুলোর riskCount >= 2)
  const riskySurveysCount = await SurveyResponse.countDocuments({
    "user.organizationId": organizationId,
    "domainRisks.riskCount": { $gte: 2 },
  });

  // Final return
  return {
    data: {
      surveys,
      statistics: {
        totalSurveys,
        totalCompletedSurveys,
        totalIncompletedSurveys,
        avgHighRiskCount,
        domainStats,
        riskySurveysCount,
      },
    },
    // meta: {
    //   page: currentPage,
    //   limit: perPage,
    //   totalFiltered: totalFilteredSurveys,
    //   totalPages: Math.ceil(totalFilteredSurveys / perPage),
    // },
  };
};

const adminGetServays = async (page?: number, limit?: number) => {
  const currentPage = page && page > 0 ? page : 1;
  const perPage = limit && limit > 0 ? limit : 10;
  const skip = (currentPage - 1) * perPage;
  const result = await SurveyResponse.find()
    .skip(skip) // Skip the number of records based on page and limit
    .limit(perPage); // Limit the number of records returned

  const total = await SurveyResponse.countDocuments(); // Get total number of survey responses

  return {
    surveys: result,
    meta: {
      page: currentPage,
      limit: perPage,
      totalPages: Math.ceil(total / perPage),
      totalWithPagination: result.length,
      totalWithoutPagination: total,
    },
  };
};

const DOMAIN_HIGH_RISK_THRESHOLD = 5; // for larger raw scales
const SCORE5_HIGH_RISK_THRESHOLD = 3.5; // for 0..5 raw scales (tune if needed)

// risk badge driven by avgRisk (float, NOT percent)
const RISK_LEVEL = { LOW_MAX: 10, MEDIUM_MAX: 20 };

const clamp0100 = (x: number) => Math.max(0, Math.min(100, x));
const pct = (part: number, total: number) =>
  total ? Math.round((part / total) * 100 * 10) / 10 : 0;

const updateDemographicMap = (
  map: Map<
    string,
    {
      people: number;
      sumHighRiskCount: number;
      highRiskRespondentCount: number;
    }
  >,
  key: string,
  surveyHighRiskCount: number
) => {
  if (!map.has(key)) {
    map.set(key, {
      people: 0,
      sumHighRiskCount: 0,
      highRiskRespondentCount: 0,
    });
  }
  const entry = map.get(key)!;
  entry.people += 1;
  entry.sumHighRiskCount += surveyHighRiskCount;
  if (surveyHighRiskCount > 0) entry.highRiskRespondentCount += 1;
};

const getOrganizationSurveyStats2 = async (
  organizationId: string,
  filters: {
    location?: "block60" | "msusundam" | "headOffice";
    gender?: "male" | "female" | "other";
    age?: "18-24" | "25-34" | "35-44" | "45-54" | "55+";
    seniorityLevel?: "senior" | "manager" | "employee";
    stream?: string;
    function?: string;
    department?: string;
  } = {}
) => {
  console.log(filters);

  const organization = await organizationModel.findById(organizationId);
  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  const priorityOrder: Array<keyof typeof filters> = [
    "seniorityLevel",
    "age",
    "gender",
    "stream",
    "function",
    "department",
    "location",
  ];

  let currentFilters: any = { ...filters };
  const removedFilters: string[] = [];

  let responses: any[] = [];
  let rollUp = false;

  // ---------------------- QUERY BUILDER ----------------------
  const buildQuery = (filtersObj: any) => {
    const andClauses: any[] = [];

    const orClauses: any[] = [];
    if (Types.ObjectId.isValid(organizationId)) {
      const oid = new Types.ObjectId(organizationId);
      orClauses.push({ organizationId: oid }, { "user.organizationId": oid });
    }
    orClauses.push(
      { organizationId },
      { "user.organizationId": organizationId }
    );

    andClauses.push({ $or: orClauses });
    andClauses.push({ status: "completed" });

    if (filtersObj.department) {
      const candidates = getFilterCandidates(filtersObj.department);
      andClauses.push({
        $or: [
          { "user.department": { $in: candidates } },
          { "user.unitDepartment": { $in: candidates } },
        ],
      });
    }

    const streamFilter = buildFieldFilter("user.stream", filtersObj.stream);
    if (streamFilter) andClauses.push(streamFilter);

    const functionFilter = buildFieldFilter("user.function", filtersObj.function);
    if (functionFilter) andClauses.push(functionFilter);

    if (filtersObj.gender)
      andClauses.push({ "user.gender": filtersObj.gender });

    if (filtersObj.age) andClauses.push({ "user.age": filtersObj.age });

    const locationFilter = buildFieldFilter("user.location", filtersObj.location);
    if (locationFilter) andClauses.push(locationFilter);

    if (filtersObj.seniorityLevel)
      andClauses.push({ "user.seniorityLevel": filtersObj.seniorityLevel });

    return andClauses.length > 1 ? { $and: andClauses } : andClauses[0];
  };

  // ---------------------- FILTER ROLLUP ----------------------
  while (true) {
    const query = buildQuery(currentFilters);
    responses = await SurveyResponse.find(query).lean();

    if (responses.length >= 4) break;
    if (priorityOrder.length === 0) break;

    rollUp = true;

    const toRemove = priorityOrder.shift()!;
    if (currentFilters[toRemove] !== undefined) {
      removedFilters.push(toRemove);
      delete currentFilters[toRemove];
    }
  }

  // ---------------------- FILTER SUMMARY ----------------------
  const activeFilters = (
    Object.keys(filters) as Array<keyof typeof filters>
  ).filter((key) => filters[key] !== undefined && filters[key] !== "");

  const usedFilters = [...activeFilters];
  const actualFilters = usedFilters.filter((f) => !removedFilters.includes(f));
  const appliedFilters = [...actualFilters];

  const totalParticipants = responses.length;

  // ---------------------- BUCKET TYPES ----------------------
  type DomainBucket = {
    surveyCount: number;
    highRiskSurveyCount: number;
    test?: any;
  };

  type DemographicBucket = {
    people: number;
    sumRiskPercent: number;
    highRiskRespondentCount: number;
  };

  // ---------------------- MAPS ----------------------
  const domainStatsMap = new Map<string, DomainBucket>();
  const ageMap = new Map<string, DemographicBucket>();
  const genderMap = new Map<string, DemographicBucket>();
  const departmentMap = new Map<string, DemographicBucket>();
  const locationMap = new Map<string, DemographicBucket>();
  const streamMap = new Map<string, DemographicBucket>();
  const functionMap = new Map<string, DemographicBucket>();

  const globalHighRiskSurveyIds = new Set<string>();

  const allQuestionIds = new Set<string>();
  for (const resp of responses) {
    for (const item of resp.responses || []) {
      if (!item?.question) continue;
      allQuestionIds.add(item.question.toString());
    }
  }

  const questionDocs = await questionModel
    .find({ _id: { $in: Array.from(allQuestionIds) } })
    .select("_id weight isFollowUp")
    .lean();
  const questionById = new Map<string, { weight: number; isFollowUp: boolean }>(
    questionDocs.map((q: any) => [
      q._id.toString(),
      { weight: Number(q.weight) || 0, isFollowUp: Boolean(q.isFollowUp) },
    ])
  );

  const updateDemographicRiskMap = (
    map: Map<string, DemographicBucket>,
    key: string,
    riskPercent: number,
    isHighRisk: boolean
  ) => {
    const existing = map.get(key) || {
      people: 0,
      sumRiskPercent: 0,
      highRiskRespondentCount: 0,
    };

    existing.people += 1;
    existing.sumRiskPercent += riskPercent;
    if (isHighRisk) existing.highRiskRespondentCount += 1;

    map.set(key, existing);
  };

  // ---------------------- MAIN LOOP ----------------------
  for (const resp of responses) {
    const surveyId = resp._id?.toString() || "";
    let isThisSurveyHighRisk = false;

    // DOMAIN METRICS
    for (const dr of resp.domainRisks || []) {
      if (!dr?.domain) continue;

      const domainName = dr.domain;

      const riskCount = typeof dr.riskCount === "number" ? dr.riskCount : 0;

      if (!domainStatsMap.has(domainName)) {
        const test = (
          await getSubdomainSeats2(organizationId, domainName, filters)
        ).dashboardDomainAverage;
        domainStatsMap.set(domainName, {
          surveyCount: 0,
          highRiskSurveyCount: 0,
          test,
        });
      }

      const bucket = domainStatsMap.get(domainName)!;
      bucket.surveyCount += 1;

      if (riskCount >= 2) {
        bucket.highRiskSurveyCount++;
        isThisSurveyHighRisk = true;
      }
    }

    if (isThisSurveyHighRisk) globalHighRiskSurveyIds.add(surveyId);
    let totalWeight = 0;
    let totalRiskWeight = 0;
    for (const item of resp.responses || []) {
      const q = questionById.get(item.question?.toString());
      if (!q) continue;
      if (q.isFollowUp) continue;
      const weight = q.weight;
      const score = effectiveScore(item.answerIndex, item.score);
      const riskFraction = riskFractionFromScore(score);
      totalWeight += weight;
      totalRiskWeight += weight * riskFraction;
    }
    const surveyRiskPercent =
      totalWeight > 0 ? (totalRiskWeight / totalWeight) * 100 : 0;

    // ---- AGE ----
    {
      const key = resp.user?.age || "unknown";
      updateDemographicRiskMap(
        ageMap,
        key,
        surveyRiskPercent,
        isThisSurveyHighRisk
      );
    }

    // ---- GENDER ----
    {
      const key = resp.user?.gender || "unknown";
      updateDemographicRiskMap(
        genderMap,
        key,
        surveyRiskPercent,
        isThisSurveyHighRisk
      );
    }

    // ---- DEPARTMENT ----
    {
      const key = resp.user?.department || "unknown";
      updateDemographicRiskMap(
        departmentMap,
        key,
        surveyRiskPercent,
        isThisSurveyHighRisk
      );
    }

    // ---- LOCATION ----
    {
      const key = resp.user?.location || "unknown";
      updateDemographicRiskMap(
        locationMap,
        key,
        surveyRiskPercent,
        isThisSurveyHighRisk
      );
    }

    // ---- STREAM ----
    {
      const key = resp.user?.stream || "unknown";
      updateDemographicRiskMap(
        streamMap,
        key,
        surveyRiskPercent,
        isThisSurveyHighRisk
      );
    }

    // ---- FUNCTION ----
    {
      const key = resp.user?.function || "unknown";
      updateDemographicRiskMap(
        functionMap,
        key,
        surveyRiskPercent,
        isThisSurveyHighRisk
      );
    }
  }

  const totalHighRiskSurveys = globalHighRiskSurveyIds.size;

  // ----------------------
  // DOMAIN CALCULATIONS
  // ----------------------
  const mentalHealthMetrics: any[] = [];
  for (const [domain, stats] of domainStatsMap.entries()) {
    const participants = stats.surveyCount;

    const riskScore =
      participants > 0
        ? Math.round((stats.highRiskSurveyCount / participants) * 10000) / 100
        : 0;

    const riskStatus =
      riskScore >= 85
        ? "High Risk"
        : riskScore >= 70
        ? "Medium Risk"
        : riskScore >= 50
        ? "Low Risk"
        : "No Risk";

    const satisfiedScore =
      Math.round(Math.max(0, Math.min(100, 100 - riskScore)) * 100) / 100;

    const satisfactionStatus =
      satisfiedScore >= 85
        ? "Highly Satisfied"
        : satisfiedScore >= 70
        ? "Satisfied"
        : satisfiedScore >= 50
        ? "Moderately Satisfied"
        : "Low Satisfaction";

    mentalHealthMetrics.push({
      domain,
      participants,
      riskScore,
      satisfiedScore,
      riskStatus,
      satisfactionStatus,
      highRiskSurveyCount: stats.highRiskSurveyCount,
      nonHighRiskSurveyCount: participants - stats.highRiskSurveyCount,
      dashboardDomainAverage: stats.test,
    });
  }

  // ----------------------
  // DEMOGRAPHIC STATS (EXACT OLD STRUCTURE)
  // ----------------------

  const ageStats: any[] = [];
  for (const [ageGroup, entry] of ageMap.entries()) {
    const people = entry.people;
    const peoplePercent =
      totalParticipants > 0
        ? Math.round((people / totalParticipants) * 1000) / 10
        : 0;

    const riskScore =
      people > 0 ? Math.round((entry.sumRiskPercent / people) * 10) / 10 : 0;

    const satisfactionScore =
      Math.round(Math.max(0, Math.min(100, 100 - riskScore)) * 10) / 10;

    ageStats.push({
      ageGroup,
      people,
      peoplePercent,
      riskScore,
      satisfactionScore,
      surveyCount: people,
      highRiskCount: entry.highRiskRespondentCount,
      nonHighRiskCount: people - entry.highRiskRespondentCount,
    });
  }

  const genderStats: any[] = [];
  for (const [gender, entry] of genderMap.entries()) {
    const people = entry.people;
    const peoplePercent =
      totalParticipants > 0
        ? Math.round((people / totalParticipants) * 1000) / 10
        : 0;

    const riskScore =
      people > 0 ? Math.round((entry.sumRiskPercent / people) * 10) / 10 : 0;

    const satisfactionScore =
      Math.round(Math.max(0, Math.min(100, 100 - riskScore)) * 10) / 10;

    genderStats.push({
      gender,
      people,
      peoplePercent,
      riskScore,
      satisfactionScore,
      surveyCount: people,
      highRiskCount: entry.highRiskRespondentCount,
      nonHighRiskCount: people - entry.highRiskRespondentCount,
    });
  }

  const departmentStats: any[] = [];
  for (const [department, entry] of departmentMap.entries()) {
    const people = entry.people;
    const departmentPercent =
      totalParticipants > 0
        ? Math.round((people / totalParticipants) * 1000) / 10
        : 0;

    const avgRisk =
      people > 0 ? Math.round((entry.sumRiskPercent / people) * 10) / 10 : 0;

    const satisfactionScore =
      Math.round(Math.max(0, Math.min(100, 100 - avgRisk)) * 10) / 10;

    departmentStats.push({
      department,
      totalResponses: people,
      departmentPercent,
      avgRisk,
      satisfactionScore,
      highRiskCount: entry.highRiskRespondentCount,
      nonHighRiskCount: people - entry.highRiskRespondentCount,
    });
  }

  const locationStats: any[] = [];
  for (const [location, entry] of locationMap.entries()) {
    const people = entry.people;
    const locationPercent =
      totalParticipants > 0
        ? Math.round((people / totalParticipants) * 1000) / 10
        : 0;

    const avgRisk =
      people > 0 ? Math.round((entry.sumRiskPercent / people) * 10) / 10 : 0;

    const satisfactionScore =
      Math.round(Math.max(0, Math.min(100, 100 - avgRisk)) * 10) / 10;

    locationStats.push({
      location,
      totalResponses: people,
      locationPercent,
      avgRisk,
      satisfactionScore,
      highRiskCount: entry.highRiskRespondentCount,
      nonHighRiskCount: people - entry.highRiskRespondentCount,
    });
  }

  const streamStats: any[] = [];
  for (const [stream, entry] of streamMap.entries()) {
    const people = entry.people;
    const streamPercent =
      totalParticipants > 0
        ? Math.round((people / totalParticipants) * 1000) / 10
        : 0;

    const avgRisk =
      people > 0 ? Math.round((entry.sumRiskPercent / people) * 10) / 10 : 0;

    const satisfactionScore =
      Math.round(Math.max(0, Math.min(100, 100 - avgRisk)) * 10) / 10;

    streamStats.push({
      stream,
      totalResponses: people,
      streamPercent,
      avgRisk,
      satisfactionScore,
      highRiskCount: entry.highRiskRespondentCount,
      nonHighRiskCount: people - entry.highRiskRespondentCount,
    });
  }

  const functionStats: any[] = [];
  for (const [func, entry] of functionMap.entries()) {
    const people = entry.people;
    const functionPercent =
      totalParticipants > 0
        ? Math.round((people / totalParticipants) * 1000) / 10
        : 0;

    const avgRisk =
      people > 0 ? Math.round((entry.sumRiskPercent / people) * 10) / 10 : 0;

    const satisfactionScore =
      Math.round(Math.max(0, Math.min(100, 100 - avgRisk)) * 10) / 10;

    functionStats.push({
      function: func,
      totalResponses: people,
      functionPercent,
      avgRisk,
      satisfactionScore,
      highRiskCount: entry.highRiskRespondentCount,
      nonHighRiskCount: people - entry.highRiskRespondentCount,
    });
  }

  // ----------------------
  // AGE DISTRIBUTION
  // ----------------------
  const ageDistribution = ageStats.map((a) => ({
    ageGroup: a.ageGroup,
    sharePercent: a.peoplePercent,
  }));

  // ----------------------
  // FINAL RESPONSE
  // ----------------------
  return {
    success: true,
    message: "Organization survey statistics fetched successfully",
    data: {
      organization,
      unit: filters.department ?? null,
      appliedFilters,
      removedFilters,
      rollUp,
      totalParticipants,
      totalHighRiskSurveys,
      mentalHealthMetrics,
      ageStats,
      genderStats,
      departmentStats,
      locationStats,
      streamStats,
      functionStats,
      ageDistribution,
    },
  };
};

const getAdminSurveyStats = async (
  filters: {
    unitDepartment?: string;
    gender?: "male" | "female" | "other";
    age?: "18-24" | "25-34" | "35-44" | "45-54" | "55+";
    location?: "block60" | "msusundam" | "headOffice";
    seniorityLevel?: "senior" | "manager" | "employee";
  } = {}
) => {
  // 1) validate org

  // 2) robust org query (ObjectId or string; top-level or nested)

  const query: any = { status: "completed" };

  // Optional filters -> user.*
  if (filters.unitDepartment) query["user.department"] = filters.unitDepartment;
  if (filters.gender) query["user.gender"] = filters.gender;
  if (filters.age) query["user.age"] = filters.age;
  if (filters.location) query["user.location"] = filters.location;
  if (filters.seniorityLevel)
    query["user.seniorityLevel"] = filters.seniorityLevel;

  // 3) fetch responses
  const responses = await SurveyResponse.find(query).lean();

  if (!responses.length) {
    return {
      success: true,
      message: "No survey responses found for this organization and filters.",
      data: {
        unit: filters.unitDepartment ?? null,
        totalParticipants: 0,
        mentalHealthMetrics: [],
        ageStats: [],
        genderStats: [],
        departmentStats: [],
        ageDistribution: [],
        genderAgeMatrix: [],
      },
    };
  }

  // 4) containers (collect values to decide thresholds)
  const totalParticipants = responses.length;

  const domainStatsMap = new Map<
    string,
    {
      sumRisk: number;
      surveyCount: number;
      values: number[];
      max: number;
      highRiskCount: number;
    }
  >();

  const ageMap = new Map<
    string,
    {
      people: number;
      sumHighRiskCount: number;
      highRiskRespondentCount: number;
    }
  >();
  const genderMap = new Map<
    string,
    {
      people: number;
      sumHighRiskCount: number;
      highRiskRespondentCount: number;
    }
  >();
  const departmentMap = new Map<
    string,
    {
      people: number;
      sumHighRiskCount: number;
      highRiskRespondentCount: number;
    }
  >();
  const genderAgeMap = new Map<
    string,
    { people: number; sumHighRiskCount: number }
  >(); // `${age}::${gender}`

  // 5) accumulate
  for (const resp of responses) {
    // domain risks
    for (const dr of resp.domainRisks || []) {
      const domainName = dr.domain;
      const riskCount = typeof dr.riskCount === "number" ? dr.riskCount : 0;

      if (!domainStatsMap.has(domainName)) {
        domainStatsMap.set(domainName, {
          sumRisk: 0,
          surveyCount: 0,
          values: [],
          max: Number.NEGATIVE_INFINITY,
          highRiskCount: 0,
        });
      }
      const bucket = domainStatsMap.get(domainName)!;
      bucket.sumRisk += riskCount;
      bucket.surveyCount += 1;
      bucket.values.push(riskCount);
      if (riskCount > bucket.max) bucket.max = riskCount;
    }

    // demographics
    const surveyHighRiskCount =
      typeof resp.highRiskCount === "number" ? resp.highRiskCount : 0;

    updateDemographicMap(
      ageMap,
      resp.user?.age || "unknown",
      surveyHighRiskCount
    );
    updateDemographicMap(
      genderMap,
      resp.user?.gender || "unknown",
      surveyHighRiskCount
    );
    updateDemographicMap(
      departmentMap,
      resp.user?.department || "unknown",
      surveyHighRiskCount
    );

    // gender x age
    const gaKey = `${resp.user?.age || "unknown"}::${
      resp.user?.gender || "unknown"
    }`;
    if (!genderAgeMap.has(gaKey))
      genderAgeMap.set(gaKey, { people: 0, sumHighRiskCount: 0 });
    const ga = genderAgeMap.get(gaKey)!;
    ga.people += 1;
    ga.sumHighRiskCount += surveyHighRiskCount;
  }

  // 6) dynamic threshold + highRiskCount per domain
  for (const [domainName, bucket] of domainStatsMap.entries()) {
    const observedMax =
      bucket.max === Number.NEGATIVE_INFINITY ? 0 : bucket.max;
    const threshold =
      observedMax <= 5
        ? SCORE5_HIGH_RISK_THRESHOLD
        : DOMAIN_HIGH_RISK_THRESHOLD;
    bucket.highRiskCount = bucket.values.filter((v) => v > threshold).length;
  }

  // 7) mentalHealthMetrics (avgRisk float, riskPercent in %)
  const mentalHealthMetrics: any[] = [];
  for (const [domain, stats] of domainStatsMap.entries()) {
    const avgRiskRaw = stats.surveyCount
      ? stats.sumRisk / stats.surveyCount
      : 0;
    const avgRisk = Math.round(avgRiskRaw * 10) / 10; // 1 decimal float

    const riskPercentRaw = stats.surveyCount
      ? (stats.highRiskCount / stats.surveyCount) * 100
      : 0;
    const riskPercent = Math.round(riskPercentRaw * 10) / 10; // 1 decimal percent

    let riskLevel = "high risk";
    if (avgRisk <= RISK_LEVEL.LOW_MAX) riskLevel = "low risk";
    else if (avgRisk <= RISK_LEVEL.MEDIUM_MAX) riskLevel = "medium risk";

    let satisfactionScore = 100 - avgRisk;
    // satisfactionScore = clamp0100(satisfactionScore);

    mentalHealthMetrics.push({
      domain,
      avgRisk, // float (NOT %)
      riskPercent, // percent (0..100)
      riskLevel,
      surveyCount: stats.surveyCount,
      highRiskCount: stats.highRiskCount,
      nonHighRiskCount: stats.surveyCount - stats.highRiskCount,
      satisfactionScore,
    });
  }

  // 8) age/gender/department stats (unchanged logic; avg of personal highRiskCount)
  const ageStats: any[] = [];
  for (const [ageGroup, entry] of ageMap.entries()) {
    const people = entry.people;
    const peoplePercent = pct(people, totalParticipants);
    const riskScore = people
      ? Math.round((entry.sumHighRiskCount / people) * 10) / 10
      : 0;
    const satisfactionScore = Math.round(clamp0100(100 - riskScore) * 10) / 10;

    ageStats.push({
      ageGroup,
      people,
      peoplePercent,
      riskScore, // float (NOT %)
      satisfactionScore,
      surveyCount: people,
      highRiskCount: entry.highRiskRespondentCount,
      nonHighRiskCount: people - entry.highRiskRespondentCount,
    });
  }

  const genderStats: any[] = [];
  for (const [gender, entry] of genderMap.entries()) {
    const people = entry.people;
    const peoplePercent = pct(people, totalParticipants);
    const riskScore = people
      ? Math.round((entry.sumHighRiskCount / people) * 10) / 10
      : 0;
    const satisfactionScore = Math.round(clamp0100(100 - riskScore) * 10) / 10;

    genderStats.push({
      gender,
      people,
      peoplePercent,
      riskScore, // float (NOT %)
      satisfactionScore,
      surveyCount: people,
      highRiskCount: entry.highRiskRespondentCount,
      nonHighRiskCount: people - entry.highRiskRespondentCount,
    });
  }

  const departmentStats: any[] = [];
  for (const [department, entry] of departmentMap.entries()) {
    const people = entry.people;
    const departmentPercent = pct(people, totalParticipants);
    const avgRisk = people
      ? Math.round((entry.sumHighRiskCount / people) * 10) / 10
      : 0;
    const satisfactionScore = Math.round(clamp0100(100 - avgRisk) * 10) / 10;

    departmentStats.push({
      department,
      totalResponses: people,
      departmentPercent,
      avgRisk, // float (NOT %)
      satisfactionScore,
      highRiskCount: entry.highRiskRespondentCount,
      nonHighRiskCount: people - entry.highRiskRespondentCount,
    });
  }

  // extras (if you need them in UI)
  const ageDistribution = ageStats.map((a) => ({
    ageGroup: a.ageGroup,
    sharePercent: a.peoplePercent,
  }));
  const genderAgeMatrix: any[] = [];
  for (const [ageGroup, ageEntry] of ageMap.entries()) {
    const totalInAge = ageEntry.people || 0;
    const rows: any[] = [];
    for (const [gaKey, gaVal] of genderAgeMap.entries()) {
      const [a, g] = gaKey.split("::");
      if (a !== ageGroup) continue;
      const people = gaVal.people;
      const percentWithinAge = totalInAge
        ? Math.round((people / totalInAge) * 100 * 10) / 10
        : 0;
      const avgRiskRaw = people ? gaVal.sumHighRiskCount / people : 0;
      const wellbeingScore =
        Math.round(clamp0100(100 - avgRiskRaw) * 100) / 100;
      rows.push({ gender: g, people, percentWithinAge, wellbeingScore });
    }
    genderAgeMatrix.push({ ageGroup, rows });
  }

  return {
    success: true,
    message: "Organization survey statistics fetched successfully",
    data: {
      // unit: filters.unitDepartment ?? null,
      totalParticipants,
      mentalHealthMetrics,
      ageStats,
      genderStats,
      departmentStats,
      ageDistribution,
      genderAgeMatrix,
    },
  };
};

const getSubdomainSeats2 = async (
  organizationId: string,
  dashboardDomain: string,
  filters: {
    gender?: "male" | "female" | "other";
    age?: "18-24" | "25-34" | "35-44" | "45-54" | "55+";
    location?: "block60" | "msusundam" | "headOffice";
    seniorityLevel?: "senior" | "manager" | "employee";
    stream?: string;
    function?: string;
    department?: string;
  } = {}
) => {
  const originalFilters = { ...filters };
  const currentFilters: any = { ...filters };

  // EXACT SAME PRIORITY ORDER (just removed subDepartment/unitDepartment)
  const removalOrder: Array<keyof typeof currentFilters> = [
    "seniorityLevel",
    "age",
    "gender",
    "stream",
    "function",
    "department",
    "location",
  ];

  const removedFilters: string[] = [];
  let finalResponses: any[] = [];
  let finalQueryUsed: any = {};
  let rollUp = false;

  // ------------------- EXACT SAME QUERY BUILDER -------------------
  const buildQueryFromFilters = (filt: any) => {
    const q: any = {
      "user.organizationId": organizationId,
      status: "completed",
    };

    if (filt.gender) q["user.gender"] = filt.gender;
    if (filt.age) q["user.age"] = filt.age;
    if (filt.location) q["user.location"] = { $in: getFilterCandidates(filt.location) };
    if (filt.seniorityLevel) q["user.seniorityLevel"] = filt.seniorityLevel;

    if (filt.stream) q["user.stream"] = { $in: getFilterCandidates(filt.stream) };
    if (filt.function) q["user.function"] = { $in: getFilterCandidates(filt.function) };
    if (filt.department) q["user.department"] = { $in: getFilterCandidates(filt.department) };

    return q;
  };

  // ------------------- EXACT SAME ROLLUP LOOP -------------------
  while (true) {
    const query = buildQueryFromFilters(currentFilters);

    const responses = await SurveyResponse.find(query)
      .populate("responses.question")
      .select("user responses")
      .lean();

    finalResponses = responses;
    finalQueryUsed = query;

    if (responses.length >= 4) break;

    const next = removalOrder.find(
      (key) => currentFilters[key] !== undefined && currentFilters[key] !== null
    );

    if (!next) break;

    removedFilters.push(next as string);
    delete currentFilters[next];
    rollUp = true;
  }

  const totalParticipants = finalResponses.length;

  // ------------------- EXACT SAME BUCKETS -------------------
  const domainScores: any = {};
  const departmentScores: any = {};
  const locationScores: any = {};
  const ageScores: any = {};
  const genderScores: any = {};
  const seniorityScores: any = {};

  // NEW BUCKETS (BUT SAME FORMAT)
  const streamScores: any = {};
  const functionScores: any = {};

  const addBucket = (bucket: any, key: string, userId: string) => {
    if (!bucket[key])
      bucket[key] = { participants: new Set(), totalScore: 0, maxScore: 0 };
    bucket[key].participants.add(userId);
  };

  // ------------------- EXACT SAME LOOP -------------------
  finalResponses.forEach((resp: any) => {
    const user = resp.user || {};
    const userId = user._id?.toString();

    const dept = user.department;
    const loc = user.location;
    const age = user.age;
    const gender = user.gender;
    const seniority = user.seniorityLevel;

    const stream = user.stream;
    const func = user.function;

    if (dept) addBucket(departmentScores, dept, userId);
    if (loc) addBucket(locationScores, loc, userId);
    if (age) addBucket(ageScores, age, userId);
    if (gender) addBucket(genderScores, gender, userId);
    if (seniority) addBucket(seniorityScores, seniority, userId);

    if (stream) addBucket(streamScores, stream, userId);
    if (func) addBucket(functionScores, func, userId);

    resp.responses.forEach((item: any) => {
      const q = item.question;
      if (!q) return;
      if (q.dashboardDomain !== dashboardDomain) return;

      const domain = q.domain;
      const weight = Number(q.weight) || 0;
      const score = effectiveScore(item.answerIndex, item.score);
      const riskFraction = riskFractionFromScore(score);
      const weightedScore = riskFraction * weight;
      const maxPossible = weight;

      if (!domainScores[domain])
        domainScores[domain] = { totalWeightedScore: 0, totalMaxScore: 0 };

      domainScores[domain].totalWeightedScore += weightedScore;
      domainScores[domain].totalMaxScore += maxPossible;

      const updateScore = (bucket: any, key: string) => {
        if (!bucket[key]) return;
        bucket[key].totalScore += weightedScore;
        bucket[key].maxScore += maxPossible;
      };

      if (dept) updateScore(departmentScores, dept);
      if (loc) updateScore(locationScores, loc);
      if (age) updateScore(ageScores, age);
      if (gender) updateScore(genderScores, gender);
      if (seniority) updateScore(seniorityScores, seniority);

      if (stream) updateScore(streamScores, stream);
      if (func) updateScore(functionScores, func);
    });
  });

  // ------------------- EXACT SAME STATUS FUNCTION -------------------
  const buildStatus = (percentage: number) => {
    let riskStatus = "No Risk";
    if (percentage >= 85) riskStatus = "High Risk";
    else if (percentage >= 70) riskStatus = "Medium Risk";
    else if (percentage >= 50) riskStatus = "Low Risk";

    const satisfied = Math.max(0, Math.min(100, 100 - percentage));

    let satisfactionStatus = "Low Satisfaction";
    if (satisfied >= 85) satisfactionStatus = "Highly Satisfied";
    else if (satisfied >= 70) satisfactionStatus = "Satisfied";
    else if (satisfied >= 50) satisfactionStatus = "Moderately Satisfied";

    return {
      riskScore: Number(percentage.toFixed(2)),
      satisfiedScore: Number(satisfied.toFixed(2)),
      riskStatus,
      satisfactionStatus,
    };
  };

  // ------------------- EXACT SAME SUMMARY BUILDER -------------------
  const buildSummary = (bucket: any, labelName: string) => {
    return Object.keys(bucket).map((key) => {
      const stats = bucket[key];
      const percentage =
        stats.maxScore > 0 ? (stats.totalScore / stats.maxScore) * 100 : 0;
      return {
        [labelName]: key,
        participants: stats.participants.size,
        ...buildStatus(percentage),
      };
    });
  };

  // ------------------- DOMAIN SUMMARY -------------------
  const domainSummary = Object.keys(domainScores).map((domain) => {
    const stats = domainScores[domain];
    const percentage =
      stats.totalMaxScore > 0
        ? (stats.totalWeightedScore / stats.totalMaxScore) * 100
        : 0;
    return {
      domain,
      participants: totalParticipants,
      ...buildStatus(percentage),
    };
  });

  // ------ OVERALL AVERAGE ------
  let avgRisk = 0;
  let avgSatisfaction = 0;

  if (domainSummary.length > 0) {
    const totalRisk = domainSummary.reduce(
      (sum, item) => sum + item.riskScore,
      0
    );
    const totalSatisfaction = domainSummary.reduce(
      (sum, item) => sum + item.satisfiedScore,
      0
    );

    avgRisk = totalRisk / domainSummary.length;
    avgSatisfaction = totalSatisfaction / domainSummary.length;
  }

  const overallStatus = buildStatus(avgRisk);

  const dashboardDomainAverage = {
    averageRiskScore: Number(avgRisk.toFixed(2)),
    averageSatisfactionScore: Number(avgSatisfaction.toFixed(2)),
    averageRiskStatus: overallStatus.riskStatus,
    averageSatisfactionStatus: overallStatus.satisfactionStatus,
  };

  // ------------------- EXACT SAME RETURN -------------------
  return {
    totalParticipants,
    dashboardDomain,
    appliedFilters: Object.keys(currentFilters),
    removedFilters,
    rollUp,
    queryUsed: finalQueryUsed,

    dashboardDomainAverage,

    domainSummary,

    departmentSummary: buildSummary(departmentScores, "department"),
    locationSummary: buildSummary(locationScores, "location"),
    ageSummary: buildSummary(ageScores, "age"),
    genderSummary: buildSummary(genderScores, "gender"),
    senioritySummary: buildSummary(seniorityScores, "seniorityLevel"),

    // EXACT SAME NEW FIELD (no rename)
    streamSummary: buildSummary(streamScores, "stream"),
    functionSummary: buildSummary(functionScores, "function"),
  };
};

const getDomainWiseMetrics = async (
  organizationId: string,
  dashboardDomain: string,
  filters: {
    gender?: "male" | "female" | "other";
    age?: "18-24" | "25-34" | "35-44" | "45-54" | "55+";
    location?: "block60" | "msusundam" | "headOffice";
    seniorityLevel?: "senior" | "manager" | "employee";
    stream?: string;
    function?: string;
    department?: string;
  } = {}
) => {
  // Clone filters
  const currentFilters: any = { ...filters };

  // Roll-up priority
  const removalOrder: Array<keyof typeof currentFilters> = [
    "seniorityLevel",
    "age",
    "gender",
    "stream",
    "function",
    "department",
    "location",
  ];

  const removedFilters: string[] = [];
  let finalResponses: any[] = [];
  let finalQueryUsed: any = {};
  let rollUp = false;

  // ------------------------------ BUILD QUERY ------------------------------
  const buildQueryFromFilters = (filt: any) => {
    const q: any = {
      "user.organizationId": organizationId,
      status: "completed",
    };

    if (filt.gender) q["user.gender"] = filt.gender;
    if (filt.age) q["user.age"] = filt.age;
    if (filt.location) q["user.location"] = filt.location;
    if (filt.seniorityLevel) q["user.seniorityLevel"] = filt.seniorityLevel;
    if (filt.stream) q["user.stream"] = filt.stream;
    if (filt.function) q["user.function"] = filt.function;
    if (filt.department) q["user.department"] = filt.department;

    return q;
  };

  // ------------------------------ FILTER ROLLUP ------------------------------
  while (true) {
    const query = buildQueryFromFilters(currentFilters);

    const responses = await SurveyResponse.find(query)
      .populate("responses.question")
      .select("user responses")
      .lean();

    finalResponses = responses;
    finalQueryUsed = query;

    if (responses.length >= 4) break; // minimum sample reached

    const nextToRemove = removalOrder.find(
      (key) => currentFilters[key] !== undefined && currentFilters[key] !== null
    );

    if (!nextToRemove) break;

    removedFilters.push(nextToRemove as string);
    delete currentFilters[nextToRemove];
    rollUp = true;
  }

  const totalParticipants = finalResponses.length;

  // ------------------------------ DOMAIN SCORING ------------------------------
  const domainScores: Record<
    string,
    { totalWeightedScore: number; totalMaxScore: number }
  > = {};

  finalResponses.forEach((resp: any) => {
    resp.responses.forEach((item: any) => {
      const q = item.question;
      if (!q) return;
      if (q.dashboardDomain !== dashboardDomain) return;
      if (q.isFollowUp) return;

      const domain = q.domain;
      const weight = Number(q.weight) || 0;
      const score = effectiveScore(item.answerIndex, item.score);
      const riskFraction = riskFractionFromScore(score);
      const weightedScore = riskFraction * weight;
      const maxPossible = weight;

      if (!domainScores[domain])
        domainScores[domain] = { totalWeightedScore: 0, totalMaxScore: 0 };

      domainScores[domain].totalWeightedScore += weightedScore;
      domainScores[domain].totalMaxScore += maxPossible;
    });
  });

  // ------------------------------ STATUS LOGIC ------------------------------
  const buildStatus = (percentage: number) => {
    let riskStatus = "No Risk";
    if (percentage >= 85) riskStatus = "High Risk";
    else if (percentage >= 70) riskStatus = "Medium Risk";
    else if (percentage >= 50) riskStatus = "Low Risk";

    const satisfiedScore = Math.max(0, Math.min(100, 100 - percentage));

    let satisfactionStatus = "Low Satisfaction";
    if (satisfiedScore >= 85) satisfactionStatus = "Highly Satisfied";
    else if (satisfiedScore >= 70) satisfactionStatus = "Satisfied";
    else if (satisfiedScore >= 50) satisfactionStatus = "Moderately Satisfied";

    return {
      riskScore: Number(percentage.toFixed(2)),
      satisfiedScore: Number(satisfiedScore.toFixed(2)),
      riskStatus,
      satisfactionStatus,
    };
  };

  // ------------------------------ DOMAIN SUMMARY ------------------------------
  const domainSummary = Object.keys(domainScores).map((domain) => {
    const stats = domainScores[domain];
    const percentage =
      stats.totalMaxScore > 0
        ? (stats.totalWeightedScore / stats.totalMaxScore) * 100
        : 0;

    return {
      domain,
      participants: totalParticipants,
      ...buildStatus(percentage),
    };
  });

  // ------------------------------ AVERAGE RISK ------------------------------
  let avgRisk = 0;
  let avgSatisfaction = 0;

  if (domainSummary.length > 0) {
    const totalRisk = domainSummary.reduce((sum, d) => sum + d.riskScore, 0);
    const totalSatisfaction = domainSummary.reduce(
      (sum, d) => sum + d.satisfiedScore,
      0
    );

    avgRisk = totalRisk / domainSummary.length;
    avgSatisfaction = totalSatisfaction / domainSummary.length;
  }

  const overallStatus = buildStatus(avgRisk);

  const dashboardDomainAverage = {
    averageRiskScore: Number(avgRisk.toFixed(2)),
    averageSatisfactionScore: Number(avgSatisfaction.toFixed(2)),
    averageRiskStatus: overallStatus.riskStatus,
    averageSatisfactionStatus: overallStatus.satisfactionStatus,
  };

  // ------------------------------ FINAL APPLIED FILTERS ------------------------------
  const appliedFilters: string[] = Object.keys(currentFilters).filter(
    (k) => currentFilters[k] !== undefined && currentFilters[k] !== null
  );

  // ------------------------------ FINAL RETURN ------------------------------
  return {
    totalParticipants,
    dashboardDomain,
    appliedFilters,
    removedFilters,
    rollUp,
    queryUsed: finalQueryUsed,
    dashboardDomainAverage,
  };
};

const getSuperAdminServaySeats = async (
  filters: {
    location?: "block60" | "msusundam" | "headOffice";
    stream?: string;
    function?: string;
    department?: string;
    gender?: "male" | "female" | "other";
    age?: "18-24" | "25-34" | "35-44" | "45-54" | "55+";
    seniorityLevel?: "senior" | "manager" | "employee";
  } = {}
) => {
  const priorityOrder: Array<keyof typeof filters> = [
    "seniorityLevel",
    "age",
    "gender",
    "stream",
    "function",
    "department",
    "location",
  ];

  let currentFilters: any = { ...filters };
  const removedFilters: string[] = [];

  let responses: any[] = [];
  let rollUp = false;

  const buildQuery = (filtersObj: any) => {
    const andClauses: any[] = [];

    // Only completed surveys
    andClauses.push({ status: "completed" });

    if (filtersObj.departments) {
      andClauses.push({
        $or: [
          { "user.department": filtersObj.unitDepartment },
          { "user.unitDepartment": filtersObj.unitDepartment },
        ],
      });
    }
    if (filtersObj.gender)
      andClauses.push({ "user.gender": filtersObj.gender });
    if (filtersObj.age) andClauses.push({ "user.age": filtersObj.age });
    if (filtersObj.location)
      andClauses.push({ "user.location": filtersObj.location });
    if (filtersObj.seniorityLevel)
      andClauses.push({ "user.seniorityLevel": filtersObj.seniorityLevel });

    return andClauses.length > 1 ? { $and: andClauses } : andClauses[0];
  };

  while (true) {
    const query = buildQuery(currentFilters);
    responses = await SurveyResponse.find(query).lean();

    if (responses.length >= 4) break;
    if (priorityOrder.length === 0) break;

    rollUp = true;

    const toRemove = priorityOrder.shift()!;
    if (currentFilters[toRemove] !== undefined) {
      removedFilters.push(toRemove);
      delete currentFilters[toRemove];
    }
  }

  const activeFilters = (
    Object.keys(filters) as Array<keyof typeof filters>
  ).filter((key) => filters[key] !== undefined && filters[key] !== "");

  const actualFilters = activeFilters.filter(
    (f) => !removedFilters.includes(f)
  );
  const appliedFilters = [...actualFilters];

  const totalParticipants = responses.length;

  type DomainBucket = {
    surveyCount: number;
    highRiskSurveyCount: number;
    test?: any;
  };

  type DemographicBucket = {
    people: number;
    sumHighRiskCount: number;
    highRiskRespondentCount: number;
  };

  const domainStatsMap = new Map<string, DomainBucket>();
  const ageMap = new Map<string, DemographicBucket>();
  const genderMap = new Map<string, DemographicBucket>();
  const departmentMap = new Map<string, DemographicBucket>();
  const locationMap = new Map<string, DemographicBucket>();
  const globalHighRiskSurveyIds = new Set<string>();

  for (const resp of responses) {
    const surveyId = resp._id?.toString() || "";
    let isThisSurveyHighRisk = false;

    for (const dr of resp.domainRisks || []) {
      if (!dr?.domain) continue;
      const domainName = dr.domain;

      // Fetch domain average across ALL organizations
      const test = (await getAllDomainMetrics(domainName, filters))
        .dashboardDomainAverage;

      const riskCount = typeof dr.riskCount === "number" ? dr.riskCount : 0;

      if (!domainStatsMap.has(domainName)) {
        domainStatsMap.set(domainName, {
          surveyCount: 0,
          highRiskSurveyCount: 0,
          test,
        });
      }
      const bucket = domainStatsMap.get(domainName)!;
      bucket.surveyCount += 1;

      if (riskCount >= 2) {
        bucket.highRiskSurveyCount += 1;
        isThisSurveyHighRisk = true;
      }
    }

    if (isThisSurveyHighRisk && surveyId) globalHighRiskSurveyIds.add(surveyId);

    const surveyHighRiskCount =
      typeof resp.highRiskCount === "number" ? resp.highRiskCount : 0;

    // Age
    {
      const key = resp.user?.age || "unknown";
      let bucket = ageMap.get(key);
      if (!bucket) {
        bucket = { people: 0, sumHighRiskCount: 0, highRiskRespondentCount: 0 };
        ageMap.set(key, bucket);
      }
      bucket.people += 1;
      bucket.sumHighRiskCount += surveyHighRiskCount;
      if (surveyHighRiskCount > 0) bucket.highRiskRespondentCount += 1;
    }

    // Gender
    {
      const key = resp.user?.gender || "unknown";
      let bucket = genderMap.get(key);
      if (!bucket) {
        bucket = { people: 0, sumHighRiskCount: 0, highRiskRespondentCount: 0 };
        genderMap.set(key, bucket);
      }
      bucket.people += 1;
      bucket.sumHighRiskCount += surveyHighRiskCount;
      if (surveyHighRiskCount > 0) bucket.highRiskRespondentCount += 1;
    }

    // Department
    {
      const key = resp.user?.department || "unknown";
      let bucket = departmentMap.get(key);
      if (!bucket) {
        bucket = { people: 0, sumHighRiskCount: 0, highRiskRespondentCount: 0 };
        departmentMap.set(key, bucket);
      }
      bucket.people += 1;
      bucket.sumHighRiskCount += surveyHighRiskCount;
      if (surveyHighRiskCount > 0) bucket.highRiskRespondentCount += 1;
    }

    // Location
    {
      const key = resp.user?.location || "unknown";
      let bucket = locationMap.get(key);
      if (!bucket) {
        bucket = { people: 0, sumHighRiskCount: 0, highRiskRespondentCount: 0 };
        locationMap.set(key, bucket);
      }
      bucket.people += 1;
      bucket.sumHighRiskCount += surveyHighRiskCount;
      if (surveyHighRiskCount > 0) bucket.highRiskRespondentCount += 1;
    }
  }

  const totalHighRiskSurveys = globalHighRiskSurveyIds.size;

  const mentalHealthMetrics: any[] = [];
  for (const [domain, stats] of domainStatsMap.entries()) {
    const participants = stats.surveyCount;

    let riskScore =
      participants > 0
        ? Math.round((stats.highRiskSurveyCount / participants) * 10000) / 100
        : 0;
    let riskStatus =
      riskScore >= 85
        ? "High Risk"
        : riskScore >= 70
        ? "Medium Risk"
        : riskScore >= 50
        ? "Low Risk"
        : "No Risk";

    let satisfiedScore =
      Math.round(Math.max(0, Math.min(100, 100 - riskScore)) * 100) / 100;
    let satisfactionStatus: string;
    if (satisfiedScore >= 85) {
      satisfactionStatus = "Highly Satisfied";
    } else if (satisfiedScore >= 70) {
      satisfactionStatus = "Satisfied";
    } else if (satisfiedScore >= 50) {
      satisfactionStatus = "Moderately Satisfied";
    } else {
      satisfactionStatus = "Low Satisfaction";
    }
    mentalHealthMetrics.push({
      domain,
      participants,
      riskScore,
      satisfiedScore,
      riskStatus,
      satisfactionStatus,
      highRiskSurveyCount: stats.highRiskSurveyCount,
      nonHighRiskSurveyCount: participants - stats.highRiskSurveyCount,
      dashboardDomainAverage: stats.test,
    });
  }

  const ageStats: any[] = [];
  for (const [ageGroup, entry] of ageMap.entries()) {
    const people = entry.people;
    let peoplePercent =
      totalParticipants > 0
        ? Math.round((people / totalParticipants) * 1000) / 10
        : 0;
    let riskScore =
      people > 0 ? Math.round((entry.sumHighRiskCount / people) * 10) / 10 : 0;
    let satisfactionScore =
      Math.round(Math.max(0, Math.min(100, 100 - riskScore)) * 10) / 10;

    ageStats.push({
      ageGroup,
      people,
      peoplePercent,
      riskScore,
      satisfactionScore,
      surveyCount: people,
      highRiskCount: entry.highRiskRespondentCount,
      nonHighRiskCount: people - entry.highRiskRespondentCount,
    });
  }

  const genderStats: any[] = [];
  for (const [gender, entry] of genderMap.entries()) {
    const people = entry.people;
    let peoplePercent =
      totalParticipants > 0
        ? Math.round((people / totalParticipants) * 1000) / 10
        : 0;
    let riskScore =
      people > 0 ? Math.round((entry.sumHighRiskCount / people) * 10) / 10 : 0;
    let satisfactionScore =
      Math.round(Math.max(0, Math.min(100, 100 - riskScore)) * 10) / 10;

    genderStats.push({
      gender,
      people,
      peoplePercent,
      riskScore,
      satisfactionScore,
      surveyCount: people,
      highRiskCount: entry.highRiskRespondentCount,
      nonHighRiskCount: people - entry.highRiskRespondentCount,
    });
  }

  const departmentStats: any[] = [];
  for (const [department, entry] of departmentMap.entries()) {
    const people = entry.people;
    let departmentPercent =
      totalParticipants > 0
        ? Math.round((people / totalParticipants) * 1000) / 10
        : 0;
    let avgRisk =
      people > 0 ? Math.round((entry.sumHighRiskCount / people) * 10) / 10 : 0;
    let satisfactionScore =
      Math.round(Math.max(0, Math.min(100, 100 - avgRisk)) * 10) / 10;

    departmentStats.push({
      department,
      totalResponses: people,
      departmentPercent,
      avgRisk,
      satisfactionScore,
      highRiskCount: entry.highRiskRespondentCount,
      nonHighRiskCount: people - entry.highRiskRespondentCount,
    });
  }

  const locationStats: any[] = [];
  for (const [location, entry] of locationMap.entries()) {
    const people = entry.people;
    let locationPercent =
      totalParticipants > 0
        ? Math.round((people / totalParticipants) * 1000) / 10
        : 0;
    let avgRisk =
      people > 0 ? Math.round((entry.sumHighRiskCount / people) * 10) / 10 : 0;
    let satisfactionScore =
      Math.round(Math.max(0, Math.min(100, 100 - avgRisk)) * 10) / 10;

    locationStats.push({
      location,
      totalResponses: people,
      locationPercent,
      avgRisk,
      satisfactionScore,
      highRiskCount: entry.highRiskRespondentCount,
      nonHighRiskCount: people - entry.highRiskRespondentCount,
    });
  }

  const ageDistribution = ageStats.map((a) => ({
    ageGroup: a.ageGroup,
    sharePercent: a.peoplePercent,
  }));

  return {
    success: true,
    message: "All survey stats fetched successfully",
    data: {
      appliedFilters,
      removedFilters,
      rollUp,
      totalParticipants,
      totalHighRiskSurveys,
      mentalHealthMetrics,
      ageStats,
      genderStats,
      departmentStats,
      locationStats,
      ageDistribution,
    },
  };
};

const getAllDomainMetrics = async (
  dashboardDomain: string,
  filters: {
    gender?: "male" | "female" | "other";
    age?: "18-24" | "25-34" | "35-44" | "45-54" | "55+";
    location?: "block60" | "msusundam" | "headOffice";
    seniorityLevel?: "senior" | "manager" | "employee";
    unitDepartment?: string;
  } = {}
) => {
  const allowedDepartments = [
    "Human Resources",
    "Senior Management",
    "it",
    "finance",
    "marketing",
    "engineering",
    "operations",
    "research",
    "customer",
    "legal",
    "administration",
    "other",
  ] as const;

  if (
    filters.unitDepartment &&
    !allowedDepartments.includes(filters.unitDepartment as any)
  ) {
    delete filters.unitDepartment;
  }

  const currentFilters: any = { ...filters };

  const removalOrder: Array<keyof typeof currentFilters> = [
    "seniorityLevel",
    "age",
    "gender",
    "subDepartment",
    "unitDepartment",
    "location",
  ];

  const removedFilters: string[] = [];
  let finalResponses: any[] = [];
  let finalQueryUsed: any = {};
  let rollUp = false;

  const buildQueryFromFilters = (filt: any) => {
    const q: any = { status: "completed" };

    if (filt.gender) q["user.gender"] = filt.gender;
    if (filt.age) q["user.age"] = filt.age;
    if (filt.location) q["user.location"] = filt.location;
    if (filt.seniorityLevel) q["user.seniorityLevel"] = filt.seniorityLevel;
    if (filt.unitDepartment) q["user.department"] = filt.unitDepartment;

    return q;
  };

  while (true) {
    const query = buildQueryFromFilters(currentFilters);

    const responses = await SurveyResponse.find(query)
      .populate("responses.question")
      .select("user responses")
      .lean();

    const count = responses.length;

    finalResponses = responses;
    finalQueryUsed = query;

    if (count >= 4) break;

    const nextToRemove = removalOrder.find(
      (key) => currentFilters[key] !== undefined && currentFilters[key] !== null
    );
    if (!nextToRemove) break;

    removedFilters.push(nextToRemove as string);

    delete currentFilters[nextToRemove];
    rollUp = true;
  }

  const totalParticipants = finalResponses.length;

  const domainScores: any = {};

  finalResponses.forEach((resp: any) => {
    const user = resp.user || {};
    const userId = user._id?.toString();

    resp.responses.forEach((item: any) => {
      const q = item.question;
      if (!q) return;
      if (q.dashboardDomain !== dashboardDomain) return;
      if (q.isFollowUp) return;

      const domain = q.domain;
      const weight = Number(q.weight) || 0;
      const score = effectiveScore(item.answerIndex, item.score);
      const riskFraction = riskFractionFromScore(score);
      const weightedScore = riskFraction * weight;
      const maxPossible = weight;

      if (!domainScores[domain])
        domainScores[domain] = { totalWeightedScore: 0, totalMaxScore: 0 };

      domainScores[domain].totalWeightedScore += weightedScore;
      domainScores[domain].totalMaxScore += maxPossible;
    });
  });

  const buildStatus = (percentage: number) => {
    let riskStatus = "No Risk";
    if (percentage >= 85) riskStatus = "High Risk";
    else if (percentage >= 70) riskStatus = "Medium Risk";
    else if (percentage >= 50) riskStatus = "Low Risk";

    const satisfied = Math.max(0, Math.min(100, 100 - percentage));
    let satisfactionStatus = "Low Satisfaction";

    if (satisfied >= 85) satisfactionStatus = "Highly Satisfied";
    else if (satisfied >= 70) satisfactionStatus = "Satisfied";
    else if (satisfied >= 50) satisfactionStatus = "Moderately Satisfied";

    return {
      riskScore: Number(percentage.toFixed(2)),
      satisfiedScore: Number(satisfied.toFixed(2)),
      riskStatus,
      satisfactionStatus,
    };
  };

  const domainSummary = Object.keys(domainScores).map((domain) => {
    const stats = domainScores[domain];
    const percentage =
      stats.totalMaxScore > 0
        ? (stats.totalWeightedScore / stats.totalMaxScore) * 100
        : 0;
    return {
      domain,
      participants: totalParticipants,
      ...buildStatus(percentage),
    };
  });

  let avgRisk = 0;
  let avgSatisfaction = 0;

  if (domainSummary.length > 0) {
    const totalRisk = domainSummary.reduce(
      (sum, item) => sum + item.riskScore,
      0
    );

    const totalSatisfaction = domainSummary.reduce(
      (sum, item) => sum + item.satisfiedScore,
      0
    );

    avgRisk = totalRisk / domainSummary.length;
    avgSatisfaction = totalSatisfaction / domainSummary.length;
  }

  const overallStatus = buildStatus(avgRisk);

  const dashboardDomainAverage = {
    averageRiskScore: Number(avgRisk.toFixed(2)),
    averageSatisfactionScore: Number(avgSatisfaction.toFixed(2)),
    averageRiskStatus: overallStatus.riskStatus,
    averageSatisfactionStatus: overallStatus.satisfactionStatus,
  };

  const appliedFilters: string[] = Object.keys(currentFilters).filter(
    (k) => currentFilters[k] !== undefined && currentFilters[k] !== null
  );

  return {
    totalParticipants,
    dashboardDomain,
    appliedFilters,
    removedFilters,
    rollUp,
    queryUsed: finalQueryUsed,
    dashboardDomainAverage,
  };
};

const getSuperAdminSubdomainSeats = async (
  filters: {
    gender?: "male" | "female" | "other";
    age?: "18-24" | "25-34" | "35-44" | "45-54" | "55+";
    location?: "block60" | "msusundam" | "headOffice";
    seniorityLevel?: "senior" | "manager" | "employee";
    unitDepartment?: string;
  } = {}
) => {
  const currentFilters: any = { ...filters };

  const removalOrder: Array<keyof typeof currentFilters> = [
    "seniorityLevel",
    "age",
    "gender",
    "subDepartment",
    "unitDepartment",
    "location",
  ];

  const removedFilters: string[] = [];
  let finalResponses: any[] = [];
  let finalQueryUsed: any = {};
  let rollUp = false;

  // --- Build query WITHOUT organizationId ---
  const buildQueryFromFilters = (filt: any) => {
    const q: any = { status: "completed" };

    if (filt.gender) q["user.gender"] = filt.gender;
    if (filt.age) q["user.age"] = filt.age;
    if (filt.location) q["user.location"] = filt.location;
    if (filt.seniorityLevel) q["user.seniorityLevel"] = filt.seniorityLevel;
    if (filt.unitDepartment) q["user.department"] = filt.unitDepartment;

    return q;
  };

  // --- Roll-up loop ---
  while (true) {
    const query = buildQueryFromFilters(currentFilters);

    const responses = await SurveyResponse.find(query)
      .populate("responses.question")
      .select("user responses")
      .lean();

    finalResponses = responses;
    finalQueryUsed = query;

    if (responses.length >= 4) break;

    const nextToRemove = removalOrder.find(
      (key) => currentFilters[key] !== undefined
    );
    if (!nextToRemove) break;

    removedFilters.push(nextToRemove as string);
    delete currentFilters[nextToRemove];
    rollUp = true;
  }

  const totalParticipants = finalResponses.length;

  // --- BUCKETS for ALL DOMAINS ---
  const domainScores: any = {}; // { domain: { totalWeightedScore, totalMaxScore } }
  const departmentScores: any = {};
  const locationScores: any = {};
  const ageScores: any = {};
  const genderScores: any = {};
  const seniorityScores: any = {};

  const addBucket = (bucket: any, key: string, userId: string) => {
    if (!bucket[key]) {
      bucket[key] = { participants: new Set(), totalScore: 0, maxScore: 0 };
    }
    bucket[key].participants.add(userId);
  };

  // --- MAIN LOOP (NO dashboardDomain filter) ---
  finalResponses.forEach((resp: any) => {
    const user = resp.user || {};
    const userId = user._id?.toString();

    const dept = user.department;
    const loc = user.location;
    const age = user.age;
    const gender = user.gender;
    const seniority = user.seniorityLevel;

    if (dept) addBucket(departmentScores, dept, userId);
    if (loc) addBucket(locationScores, loc, userId);
    if (age) addBucket(ageScores, age, userId);
    if (gender) addBucket(genderScores, gender, userId);
    if (seniority) addBucket(seniorityScores, seniority, userId);

    // Loop through all responses for all domains
    resp.responses.forEach((item: any) => {
      const q = item.question;
      if (!q) return;
      if (q.isFollowUp) return;

      const domain = q.domain; // <-- IMPORTANT: USING ALL DOMAINS NOW

      const weight = Number(q.weight) || 0;
      const score = effectiveScore(item.answerIndex, item.score);
      const riskFraction = riskFractionFromScore(score);
      const weightedScore = riskFraction * weight;
      const maxPossible = weight;

      if (!domainScores[domain]) {
        domainScores[domain] = { totalWeightedScore: 0, totalMaxScore: 0 };
      }

      domainScores[domain].totalWeightedScore += weightedScore;
      domainScores[domain].totalMaxScore += maxPossible;

      const updateScore = (bucket: any, key: string) => {
        if (!bucket[key]) return;
        bucket[key].totalScore += weightedScore;
        bucket[key].maxScore += maxPossible;
      };

      if (dept) updateScore(departmentScores, dept);
      if (loc) updateScore(locationScores, loc);
      if (age) updateScore(ageScores, age);
      if (gender) updateScore(genderScores, gender);
      if (seniority) updateScore(seniorityScores, seniority);
    });
  });

  // --- STATUS BUILDER ---
  const buildStatus = (percentage: number) => {
    let riskStatus = "No Risk";
    if (percentage >= 85) riskStatus = "High Risk";
    else if (percentage >= 70) riskStatus = "Medium Risk";
    else if (percentage >= 50) riskStatus = "Low Risk";

    const satisfiedScore = Math.max(0, Math.min(100, 100 - percentage));
    let satisfactionStatus = "Low Satisfaction";

    if (satisfiedScore >= 85) satisfactionStatus = "Highly Satisfied";
    else if (satisfiedScore >= 70) satisfactionStatus = "Satisfied";
    else if (satisfiedScore >= 50) satisfactionStatus = "Moderately Satisfied";

    return {
      riskScore: Number(percentage.toFixed(2)),
      satisfiedScore: Number(satisfiedScore.toFixed(2)),
      riskStatus,
      satisfactionStatus,
    };
  };

  // --- SUMMARY FOR ALL DOMAINS ---
  const domainSummary = Object.keys(domainScores).map((domain) => {
    const stats = domainScores[domain];

    const percentage =
      stats.totalMaxScore > 0
        ? (stats.totalWeightedScore / stats.totalMaxScore) * 100
        : 0;

    return {
      domain,
      participants: totalParticipants,
      ...buildStatus(percentage),
    };
  });

  // --- OVERALL AVERAGE ---
  let avgRisk = 0;
  let avgSatisfaction = 0;

  if (domainSummary.length > 0) {
    avgRisk =
      domainSummary.reduce((sum, d) => sum + d.riskScore, 0) /
      domainSummary.length;

    avgSatisfaction =
      domainSummary.reduce((sum, d) => sum + d.satisfiedScore, 0) /
      domainSummary.length;
  }

  const overallStatus = buildStatus(avgRisk);

  const dashboardDomainAverage = {
    averageRiskScore: Number(avgRisk.toFixed(2)),
    averageSatisfactionScore: Number(avgSatisfaction.toFixed(2)),
    averageRiskStatus: overallStatus.riskStatus,
    averageSatisfactionStatus: overallStatus.satisfactionStatus,
  };

  const buildSummary = (bucket: any, label: string) => {
    return Object.keys(bucket).map((key) => {
      const stats = bucket[key];
      const percentage =
        stats.maxScore > 0 ? (stats.totalScore / stats.maxScore) * 100 : 0;

      return {
        [label]: key,
        participants: stats.participants.size,
        ...buildStatus(percentage),
      };
    });
  };

  const appliedFilters = Object.keys(currentFilters);

  return {
    totalParticipants,
    appliedFilters,
    removedFilters,
    rollUp,
    queryUsed: finalQueryUsed,

    dashboardDomainAverage,

    // ALL DOMAINS INCLUDED
    domainSummary,

    departmentSummary: buildSummary(departmentScores, "department"),
    locationSummary: buildSummary(locationScores, "location"),
    ageSummary: buildSummary(ageScores, "age"),
    genderSummary: buildSummary(genderScores, "gender"),
    senioritySummary: buildSummary(seniorityScores, "seniorityLevel"),
  };
};

const getSuperAdminOrganizationServays = async (
  organizationId?: string,
  status?: "completed" | "in-progress"
) => {
  const filter: Record<string, any> = {};

  // Apply org filter only if organizationId provided
  if (organizationId) {
    filter["user.organizationId"] = organizationId;
  }

  if (status) {
    filter.status = status;
  }

  const surveysQuery = SurveyResponse.find(filter).select(
    "user highRiskCount status organizationId domainRisks"
  );

  const [
    surveys,
    totalFilteredSurveys,
    totalCompletedSurveys,
    totalIncompletedSurveys,
    totalSurveys,
    completedSurveys,
  ] = await Promise.all([
    surveysQuery,
    SurveyResponse.countDocuments(filter),
    SurveyResponse.countDocuments({
      ...(organizationId && { "user.organizationId": organizationId }),
      status: "completed",
    }),
    SurveyResponse.countDocuments({
      ...(organizationId && { "user.organizationId": organizationId }),
      status: "in-progress",
    }),
    SurveyResponse.countDocuments({
      ...(organizationId && { "user.organizationId": organizationId }),
    }),
    SurveyResponse.find({
      ...(organizationId && { "user.organizationId": organizationId }),
      status: "completed",
    }).select("highRiskCount"),
  ]);

  // Average high risk count
  let avgHighRiskCount = 0;
  if (completedSurveys.length > 0) {
    const totalHighRiskCount = completedSurveys.reduce(
      (acc, survey) => acc + (survey.highRiskCount || 0),
      0
    );
    avgHighRiskCount = totalHighRiskCount / completedSurveys.length;
  }

  // Build dynamic match for aggregation
  const domainMatch: Record<string, any> = {};

  if (organizationId) {
    domainMatch["user.organizationId"] = new Types.ObjectId(organizationId);
  }

  const pipeline: any[] = [];

  if (organizationId) {
    pipeline.push({ $match: domainMatch });
  }

  pipeline.push(
    { $unwind: "$domainRisks" },
    {
      $group: {
        _id: "$domainRisks.domain",
        totalRiskCount: { $sum: "$domainRisks.riskCount" },
      },
    }
  );

  const domainStats = await SurveyResponse.aggregate(pipeline);

  const riskySurveysCount = await SurveyResponse.countDocuments({
    ...(organizationId && { "user.organizationId": organizationId }),
    "domainRisks.riskCount": { $gte: 2 },
  });

  return {
    data: {
      surveys,
      statistics: {
        totalSurveys,
        totalCompletedSurveys,
        totalIncompletedSurveys,
        avgHighRiskCount,
        domainStats,
        riskySurveysCount,
      },
    },
  };
};

const getSuperAdminAllSurveyResult = async () => {
  const surveys = await SurveyResponse.find({ status: "completed" })
    .populate("questions")
    .populate("followUpQuestions")
    .populate("responses.question")
    .lean();

  if (!surveys || surveys.length === 0) {
    throw new AppError("No completed surveys found", httpStatus.NOT_FOUND);
  }

  const dashboardDomains = [
    "Clinical Risk Index",
    "Psychological Safety Index",
    "Workload & Efficiency",
    "Leadership & Alignment",
    "Satisfaction & Engagement",
  ];

  const domainResults: { [key: string]: any } = {};

  // initialize buckets
  dashboardDomains.forEach((d) => {
    domainResults[d] = {
      totalWRS: 0,
      totalMaxPossible: 0,
      riskCount: 0,
      responses: [],
      surveyCount: 0,
    };
  });

  // Loop through ALL surveys
  surveys.forEach((survey) => {
    survey.responses.forEach((res: any) => {
      const q = res.question;
      if (!q || !q.dashboardDomain) return;
      if (q.isFollowUp) return;

      const domain = q.dashboardDomain;

      if (!dashboardDomains.includes(domain)) return;

      const weight = Number(q.weight) || 0;
      const score = effectiveScore(res.answerIndex, res.score);
      const riskFraction = riskFractionFromScore(score);
      const weightedRisk = riskFraction * weight;

      domainResults[domain].totalWRS += weightedRisk;
      domainResults[domain].totalMaxPossible += weight;
      domainResults[domain].responses.push(res);
    });

    // domain risk counts
    survey.domainRisks?.forEach((dr: any) => {
      if (domainResults[dr.domain]) {
        domainResults[dr.domain].riskCount += dr.riskCount;
      }
    });

    dashboardDomains.forEach((d) => {
      domainResults[d].surveyCount++;
    });
  });

  // compute final stats
  // dashboardDomains.forEach((domain) => {
  //   const data = domainResults[domain];
  //   const { totalWRS, totalMaxPossible } = data;

  //   let domainScore = 0;
  //   let healthyScore = 0;

  //   if (totalMaxPossible > 0) {
  //     domainScore = (1 - totalWRS / totalMaxPossible) * 100;
  //     healthyScore = totalWRS / totalMaxPossible;
  //   }

  //   data.domainScore = domainScore.toFixed(4);
  //   data.healthyScore = healthyScore;
  // });

  dashboardDomains.forEach((domain) => {
    const data = domainResults[domain];
    const totalRiskWeight = Number(data.totalWRS) || 0;
    const totalWeight = Number(data.totalMaxPossible) || 0;

    const riskPercent =
      totalWeight > 0 ? (totalRiskWeight / totalWeight) * 100 : 0;
    const healthyScore = 1 - riskPercent / 100;

    data.domainScore = Number(riskPercent.toFixed(2));
    data.healthyScore = Number(healthyScore.toFixed(4));
  });

  return {
    totalSurveys: surveys.length,
    domainResults,
    surveys,
  };
};

export const SurveyService = {
  startSurvey,
  submitAnswer,
  getSurveyResult,
  getAllServeysResult,
  getSingleOrganizationServays,
  // getOrganizationSurveyStats,
  getOrganizationSurveyStats2,

  getAdminSurveyStats,
  adminGetServays,
  // getSubdomainSeats,
  getSubdomainSeats2,
  getSuperAdminServaySeats,
  getSuperAdminSubdomainSeats,
  getSuperAdminOrganizationServays,
  getSuperAdminAllSurveyResult,
};
