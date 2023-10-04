import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { User } from "../../app/entities/user.entity";

@Injectable()
export class ProfileService {
	constructor(
		@InjectRepository(User)
		private userRepository: Repository<User>
	) {}

	async getUserByUsername(username: string): Promise<User> {
		const user = await this.userRepository.findOne({
			where: { username: username },
		});
		if (!user) {
			throw new NotFoundException("User not found");
		}
		return user;
	}

	async getUserFromNormalizedUsername(
		normalizedUsername: string
	): Promise<User> {
		const user = await this.userRepository.findOne({
			where: {
				username: ILike(normalizedUsername),
			},
		});
		if (!user) {
			throw new NotFoundException("User not found");
		}
		return user;
	}
}
