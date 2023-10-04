import { Module } from "@nestjs/common";
import { ProfileController } from "./controller/profile.controller";
import { ProfileService } from "./service/profile.service";
import { MatchHistoryService } from "../app/service/matchHistory.service";
import { UserStatsService } from "../app/service/userStats.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../app/entities/user.entity";
import { MatchHistory } from "../app/entities/matchHistory.entity";
import { UserStats } from "../app/entities/userStats.entity";

@Module({
	imports: [
		TypeOrmModule.forFeature([User, MatchHistory, UserStats]), // ajoutez les entités dont vous avez besoin ici
	],
	controllers: [ProfileController],
	providers: [ProfileService, MatchHistoryService, UserStatsService],
})
export class ProfileModule {}
