import express from "express";
import { organizationController } from "./organization.controller";


const router = express.Router();

router.post("/post_organization", organizationController.postOrganization);
router.post("/login", organizationController.loginOrganization);
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
