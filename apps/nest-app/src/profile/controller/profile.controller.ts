import { Controller, Get, Param, Res } from "@nestjs/common";
import { ProfileService } from "../service/profile.service";
import { MatchHistoryService } from "../../app/service/matchHistory.service";
import { UserStatsService } from "../../app/service/userStats.service";
import { Response } from "express";

interface Match {
	user1: string;
	user2: string;
	outcome: boolean;
	finalScore: string;
	date: Date;
}

@Controller("profile")
export class ProfileController {
	constructor(
		private readonly profileService: ProfileService,
		private readonly MatchHistoryService: MatchHistoryService,
		private readonly UserStatsService: UserStatsService
	) {}

	@Get(":username")
	async getUserProfile(
		@Param("username") username: string,
		@Res() res: Response
	): Promise<void> {
		try {
			const user =
				await this.profileService.getUserFromNormalizedUsername(
					username
				);
			const avatar = process.env.NEST_URL + "/uploads/" + user.avatar;
			const userGamesHistory =
				await this.MatchHistoryService.getMatchHistory(user.id);

			const userStats = await this.UserStatsService.getUserStats(user);
			res.status(200).json({
				avatar: avatar,
				username: user.username,
				userGamesHistory: userGamesHistory,
				victories: userStats.victories,
				defeats: userStats.defeats,
				winRate: userStats.winRate,
				rank: userStats.rank,
				level: userStats.level,
				achievements: userStats.achievements,
			});
		} catch (error) {
			res.status(404).send();
		}
	}
}
