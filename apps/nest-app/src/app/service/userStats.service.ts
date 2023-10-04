import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserStats } from "../entities/userStats.entity";
import { User } from "../entities/user.entity";

@Injectable()
export class UserStatsService {
	constructor(
		@InjectRepository(UserStats)
		private userStatsRepository: Repository<UserStats>,
		@InjectRepository(User)
		private userRepository: Repository<User>
	) {}

	async getUserStats(user: User): Promise<{
		victories: number;
		defeats: number;
		winRate: number;
		rank: number;
		level: number;
		achievements: string;
	}> {
		let userStats = await this.userStatsRepository
			.createQueryBuilder("userStats")
			.where("userStats.user.id = :userId", { userId: user.id })
			.getOne();
		if (!userStats) {
			// Créer un nouvel enregistrement userStats avec des valeurs par défaut
			userStats = new UserStats();
			userStats.user = user;
			userStats.victories = 0;
			userStats.defeats = 0;
			userStats.level = 0;
			userStats.rank = 0;
		}
		return {
			victories: userStats.victories,
			defeats: userStats.defeats,
			winRate: userStats.winRate,
			rank: userStats.rank,
			level: userStats.level,
			achievements: userStats.achievements,
		};
	}

	async updateStatsAfterGame(
		userId: number,
		outcome: boolean
	): Promise<void> {
		let userStats = await this.userStatsRepository.findOne({
			where: { user: { id: userId } },
		});

		if (!userStats) {
			// Trouver l'utilisateur associé
			const user = await this.userRepository.findOne({
				where: { id: userId },
			});
			if (!user) {
				throw new NotFoundException("User not found");
			}

			// Créer un nouvel enregistrement userStats avec des valeurs par défaut
			userStats = new UserStats();
			userStats.user = user;
			userStats.victories = 0;
			userStats.defeats = 0;
			userStats.level = 0;
			userStats.rank = 0;
		}
		if (outcome) {
			userStats.victories++;
		} else {
			userStats.defeats++;
		}
		userStats.winRate =
			(userStats.victories / (userStats.victories + userStats.defeats)) *
			100;
		await this.userStatsRepository.save(userStats);
	}
}
