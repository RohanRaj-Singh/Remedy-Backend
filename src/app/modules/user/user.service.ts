import { createToken } from './../../utils/JWT';

import bcrypt from "bcrypt";
import { User } from "./user.schema";

export async function createSuperAdmin() {
  const existing = await User.findOne({ role: "admin" });

  if (existing) {
    console.log("Super Admin already exists!");
    return;
  }

  const hashedPassword = await bcrypt.hash("admin123", 12);

  await User.create({
    name: "Admin",
    email: "admin@remedy.com",
    password: hashedPassword,
    role: "admin",
  });

  console.log("Super Admin created successfully!");
}


const loginSuperAdmin =async(data:{email:string,password:string}) => {
  const user = await User.findOne({ email: data.email }).select("+password");
//   console.log(user);

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isPasswordMatch = await bcrypt.compare(
    data.password,
    user.password!
  );

  if (!isPasswordMatch) {
    throw new Error("Invalid credentials");
  }

  const token = createToken({ _id: user._id, email: user.email , role: user.role, name: user.name});

  return { token };
}   
  

export const UserService = {
  loginSuperAdmin
};