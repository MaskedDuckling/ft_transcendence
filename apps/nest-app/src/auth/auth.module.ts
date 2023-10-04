import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { diskStorage } from "multer";
import { User } from "../app/entities/user.entity";
import { UserService } from "../app/service/user.service";
import { AuthController } from "./controller/auth.controller";
import { AuthService } from "./service/auth.service";

@Module({
	imports: [
		ConfigModule.forRoot(),
		TypeOrmModule.forFeature([User]),
		MulterModule.register({
			storage: diskStorage({
				destination: "./public/uploads",
				filename: (req, file, callback) => {
					const uniqueSuffix =
						Date.now() + "-" + Math.round(Math.random() * 1e9);
					const extension = file.originalname.split(".").pop();
					const filename = `${uniqueSuffix}.${extension}`;
					callback(null, filename);
				},
			}),
		}),
	],
	controllers: [AuthController],
	providers: [AuthService, UserService],
})
export class AuthModule {}
