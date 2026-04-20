import { Types } from "mongoose";

export interface IOrganization {
  _id:Types.ObjectId
  name: string;
  username: string;
  password?: string;
  emailInvitationUsername?: string;
  emailInvitationPassword?: string;
  emailInvitationPasswordUpdatedAt?: Date;
  survayProvideLink:string
  organizationSurvaysLink:string
  isDelete?: boolean;
}