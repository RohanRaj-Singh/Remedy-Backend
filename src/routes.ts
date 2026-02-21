import { Router } from "express";

import { SurveyRoutes } from "./app/modules/survey/survey.routes";
import { questionRoutes } from "./app/modules/question/question.routes";
import { organizationRoutes } from "./app/modules/organization/organization.routes";
import { UserRoutes } from "./app/modules/user/user.route";

const appRouter = Router();

const moduleRoutes = [
  {
    path: "/question",
    route: questionRoutes,
  },
  {
    path: "/survey",
    route: SurveyRoutes,
  },
  {
    path: "/organization",
    route: organizationRoutes,
  },
  {
    path:"/user",
    route:UserRoutes
  }
];
moduleRoutes.forEach((route) => appRouter.use(route.path, route.route));
export default appRouter;
