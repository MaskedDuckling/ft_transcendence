import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Friendship } from "../entities/friendship.entity";
import { User, UserStatus } from "../entities/user.entity";
import { FriendshipStatus } from "../entities/friendship.entity";

@Injectable()
export class FriendshipService {
	constructor(
		@InjectRepository(Friendship)
		private friendshipRepository: Repository<Friendship>
	) {}

	async createFriendship(user: User, friend: User): Promise<Friendship> {
		const newFriendship = new Friendship();
		newFriendship.user = user;
		newFriendship.friend = friend;
		newFriendship.status = FriendshipStatus.PENDING;

		return await this.friendshipRepository.save(newFriendship);
	}

	async getFriendshipFromUserToFriend(
		userId: number,
		friendId: number
	): Promise<Friendship | null> {
		const numUserId = Number(userId);
		if (isNaN(numUserId)) {
			throw new Error("userId must be a number");
		}
		return await this.friendshipRepository
			.createQueryBuilder("friendship")
			.where(
				"friendship.user = :numUserId AND friendship.friend = :friendId",
				{ numUserId, friendId }
			)
			.getOne();
	}

	async getFriendshipFromFriendToUser(
		userId: number,
		friendId: number
	): Promise<Friendship | null> {
		const numUserId = Number(userId);
		if (isNaN(numUserId)) {
			throw new Error("userId must be a number");
		}
		return await this.friendshipRepository
			.createQueryBuilder("friendship")
			.where(
				"friendship.user = :friendId AND friendship.friend = :numUserId",
				{ numUserId, friendId }
			)
			.getOne();
	}

	async getFriendship(
		userId: number,
		friendId: number
	): Promise<Friendship | null> {
		const numUserId = Number(userId);
		if (isNaN(numUserId)) {
			throw new Error("userId must be a number");
		}
		const friendship = await this.friendshipRepository
			.createQueryBuilder("friendship")
			.leftJoinAndSelect("friendship.user", "user")
			.leftJoinAndSelect("friendship.friend", "friend")
			.where(
				"friendship.user = :numUserId AND friendship.friend = :friendId",
				{ numUserId, friendId }
			)
			.orWhere(
				"friendship.user = :friendId AND friendship.friend = :numUserId",
				{ numUserId, friendId }
			)
			.getOne();

		return friendship;
	}

	async amITheRequester(
		userId: number,
		friendship: Friendship
	): Promise<boolean> {
		if (!friendship || !friendship.user || !friendship.user.id) {
			throw new Error("Invalid friendship object");
		}
		// console.log(
		// 	"amITheRequester, userId:",
		// 	friendship.user.id === userId,
		// 	userId,
		// 	friendship.user.id
		// );
		return friendship.user.id === userId;
	}
	async getFriendshipsForUser(
		userId: number
	): Promise<{ username: string; status: UserStatus }[]> {
		const friendships = await this.friendshipRepository.find({
			where: {
				user: { id: userId },
				status: FriendshipStatus.ACCEPTED,
			},
			relations: ["friend"],
		});

		const friendDetails = friendships.map((friendship) => ({
			username: friendship.friend.username,
			status: friendship.friend.status,
		}));

		return friendDetails;
	}

	async updateFriendshipStatus(
		friendship: Friendship,
		status: FriendshipStatus
	): Promise<Friendship> {
		friendship.status = status;

		return await this.friendshipRepository.save(friendship);
	}

	async removeFriendship(friendship: Friendship): Promise<void> {
		await this.friendshipRepository.remove(friendship);
	}

	async getPendingFriendshipsForUser(
		userId: number
	): Promise<{ username: string }[]> {
		const pendingFriendships = await this.friendshipRepository.find({
			where: {
				friend: { id: userId },
				status: FriendshipStatus.PENDING,
			},
			relations: ["user"],
		});

		const requesterDetails = pendingFriendships.map((friendship) => ({
			username: friendship.user.username,
		}));

		return requesterDetails;
	}

	async getPendingFriendshipRequestsForUser(
		userId: number
	): Promise<{ username: string }[]> {
		const pendingFriendships = await this.friendshipRepository.find({
			where: {
				user: { id: userId },
				status: FriendshipStatus.PENDING,
			},
			relations: ["friend"],
		});

		const requesterDetails = pendingFriendships.map((friendship) => ({
			username: friendship.friend.username,
		}));

		return requesterDetails;
	}

	async getFriendIdsForUser(userId: number): Promise<number[]> {
		// Récupérer les relations d'amitié où l'utilisateur est l'utilisateur demandeur
		const friendshipsInitiatedByUser = await this.friendshipRepository.find(
			{
				where: {
					user: { id: userId },
					status: FriendshipStatus.ACCEPTED,
				},
				relations: ["friend"],
			}
		);

		// Récupérer les relations d'amitié où l'utilisateur est l'ami
		const friendshipsReceivedByUser = await this.friendshipRepository.find({
			where: {
				friend: { id: userId },
				status: FriendshipStatus.ACCEPTED,
			},
			relations: ["user"],
		});

		// Extraire les ID des amis à partir des deux listes
		const friendIds = [
			...friendshipsInitiatedByUser.map((f) => f.friend.id),
			...friendshipsReceivedByUser.map((f) => f.user.id),
		];

		return friendIds;
	}
}
