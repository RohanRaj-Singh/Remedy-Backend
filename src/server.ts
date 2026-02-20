
import mongoose from "mongoose";
import app from "./app";
import { configs } from "./app/configs";
import { createSuperAdmin } from "./app/modules/user/user.service";
async function main() {
    await mongoose.connect(configs.db_url!);
    await createSuperAdmin(); 
    app.listen(configs.port, () => {
        console.log(`Server listening on port ${configs.port}`);
    });
}
main().catch(err => console.log(err));
