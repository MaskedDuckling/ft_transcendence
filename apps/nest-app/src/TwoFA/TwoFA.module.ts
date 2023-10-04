import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm"; // Importez le module TypeOrmModule
import { User } from "../app/entities/user.entity";
import { UserService } from "../app/service/user.service";
import { TwoFAController } from "./controller/TwoFA.controller";
import { TwoFAService } from "./service/TwoFA.service";

@Module({
	imports: [
		ConfigModule.forRoot(),
		TypeOrmModule.forFeature([User]), // Importez le module contenant UserService ici
	],
	controllers: [TwoFAController],
	providers: [TwoFAService, UserService],
})
export class TwoFAModule {}
