import { Types } from "mongoose";

export interface IOrganization {
  _id:Types.ObjectId
  name: string;
  username: string;
  password?: string;
  survayProvideLink:string
  organizationSurvaysLink:string
  isDelete?: boolean;
}