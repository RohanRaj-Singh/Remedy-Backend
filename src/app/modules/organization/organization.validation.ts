import { z } from "zod";

export const createOrganizationSchema = z.object({
  body: z.object({
    name: z.string(),
    password: z.string(),
  }),
});

export const loginOrganizationSchema = z.object({
  body: z.object({
    name: z.string(),
    password: z.string(),
  }),
});
