import express from "express";
import { organizationController } from "./organization.controller";
import validateEmailInvitationAccess from "../../middlewares/validateEmailInvitationAccess";


const router = express.Router();

router.post("/post_organization", organizationController.postOrganization);
router.post("/login", organizationController.loginOrganization);
router.post(
  "/email-invitations/login",
  organizationController.loginEmailInvitationsAccess
);
router.post(
  "/email-invitations/change-password",
  validateEmailInvitationAccess(),
  organizationController.changeEmailInvitationsPassword
);
router.get("/get_all_organization", organizationController.getAllOrganization);
router.get(
  "/get_single_organization/:id",
  organizationController.getSingleOrganization
);
router.put(
  "/update_organization/:id",
  organizationController.updateOrganization
);
router.delete(
  "/delete_organization/:id",
  organizationController.deleteOrganization
);

export const organizationRoutes = router;
