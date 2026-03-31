require("dotenv/config");
const mongoose = require("mongoose");
const EmployeeInvite = mongoose.model("employee_invites", new mongoose.Schema({}, { strict: false }));

(async () => {
  await mongoose.connect(process.env.DB_URL);
  const result = await EmployeeInvite.updateOne(
    { email: "internationaltijarat.com@gmail.com" },
    { $set: { completed: true, completedAt: new Date() } }
  );
  console.log("Updated:", result.modifiedCount, "record(s)");
  await mongoose.disconnect();
})();
