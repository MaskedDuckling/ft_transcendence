import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MatchHistory } from "../entities/matchHistory.entity";
import { User } from "../entities/user.entity";

@Injectable()
export class MatchHistoryService {
	constructor(
		@InjectRepository(MatchHistory)
		private matchHistoryRepository: Repository<MatchHistory>
	) {}

	async createMatch(
		user1: User,
		user2: User,
		outcome: boolean,
		finalScore: string,
		date: Date
	): Promise<MatchHistory> {
		const newMatch = new MatchHistory();
		newMatch.user1 = user1;
		newMatch.user2 = user2;
		newMatch.outcome = outcome;
		newMatch.finalScore = finalScore;
		newMatch.date = date;

		return this.matchHistoryRepository.save(newMatch);
	}

	async getMatchHistory(userId: number): Promise<
		Array<{
			user1: string;
			user2: string;
			outcome: boolean;
			finalScore: string;
			date: Date;
		}>
	> {
		const matches = await this.matchHistoryRepository
			.createQueryBuilder("matchHistory")
			.leftJoinAndSelect("matchHistory.user1", "user1")
			.leftJoinAndSelect("matchHistory.user2", "user2")
			.where("matchHistory.user1 = :userId", { userId })
			.orWhere("matchHistory.user2 = :userId", { userId })
			.orderBy("matchHistory.date", "DESC") // trier par date en ordre décroissant
			.take(20) // limiter à 20 matchs
			.getMany();
		if (!matches) {
			throw new NotFoundException(
				"User's match history couldn't be retrieved"
			);
		}
		const orderedMatches = matches.reverse(); // Inverse l'ordre des matchs
		return orderedMatches.map((match) => ({
			user1: match.user1.username, // Utiliser seulement le nom d'utilisateur
			user2: match.user2.username, // Utiliser seulement le nom d'utilisateur
			outcome: userId === match.user1.id ? match.outcome : !match.outcome, // inversion de l'issue si l'utilisateur est user2
			finalScore: match.finalScore,
			date: match.date,
		}));
	}
}
