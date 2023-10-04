import { User } from "./src/app/entities/user.entity";

declare module "express-serve-static-core" {
    // Inject additional properties on express.Request
    export interface Request {
        user?: User
    }
}