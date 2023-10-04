import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ChannelUser, UserRole } from "../entities/channelUser.entity";
import { User } from "../entities/user.entity";
import { Channel } from "../entities/channel.entity";

@Injectable()
export class ChannelUserService {
	constructor(
		@InjectRepository(ChannelUser)
		private channelUserRepository: Repository<ChannelUser>,
		@InjectRepository(User)
		private userRepository: Repository<User>,
		@InjectRepository(Channel)
		private channelRepository: Repository<Channel>
	) {}

	async joinChannel(
		userId: number,
		channelId: number,
		role: UserRole
	): Promise<ChannelUser> {
		const user = await this.userRepository.findOne({
			where: { id: userId },
		});
		const channel = await this.channelRepository.findOne({
			where: { id: channelId },
		});

		if (!user || !channel) {
			throw new Error("User or Channel not found");
		}

		const channelUser = new ChannelUser();
		channelUser.user = user;
		channelUser.channel = channel;
		channelUser.role = role;

		return await this.channelUserRepository.save(channelUser);
	}

	async leaveChannel(userId: number, channelId: number): Promise<void> {
		const entry = await this.channelUserRepository.findOne({
			where: {
				user: { id: userId },
				channel: { id: channelId },
			},
		});
		if (!entry) {
			throw new Error("User is not a member of this Channel");
		}
		await this.channelUserRepository.remove(entry);
	}

	async getChannelUser(
		channelId: number,
		userId: number
	): Promise<ChannelUser> {
		const chanUser = await this.channelUserRepository.findOne({
			where: {
				channel: { id: channelId },
				user: { id: userId },
			},
		});

		if (!chanUser) {
			throw new NotFoundException("Channel User not found.");
		}
		return chanUser;
	}

	async getUserChannels(userId: number): Promise<Channel[]> {
		const entries = await this.channelUserRepository.find({
			where: { user: { id: userId } },
			relations: ["channel"],
		});
		return entries.map((entry) => entry.channel);
	}

	async getUserRoleInChannel(
		userId: number,
		channelId: number
	): Promise<string | null> {
		const entry = await this.channelUserRepository.findOne({
			where: {
				user: { id: userId },
				channel: { id: channelId },
			},
		});
		return entry ? entry.role : null;
	}

	async getUsersByChannel(channelId: number): Promise<ChannelUser[]> {
		return await this.channelUserRepository.find({
			where: { channel: { id: channelId } },
			relations: ["user"],
		});
	}

	async hasAdminRights(channelId: number, userId: number): Promise<boolean> {
		const channelUser = await this.channelUserRepository.findOne({
			where: { channel: { id: channelId }, user: { id: userId } },
		});

		return (
			channelUser?.role === UserRole.ADMIN ||
			channelUser?.role === UserRole.OWNER
		);
	}

	async promoteToAdmin(
		channelId: number,
		adminOrOwnerId: number,
		userIdToPromote: number
	): Promise<void> {
		// Vérifier si l'utilisateur qui essaie de promouvoir est un administrateur ou propriétaire du canal
		const hasRights = await this.hasAdminRights(channelId, adminOrOwnerId);

		if (!hasRights) {
			throw new Error(
				"Only the owner or an admin can promote a user to admin"
			);
		}

		const channelUserToPromote = await this.channelUserRepository.findOne({
			where: {
				channel: { id: channelId },
				user: { id: userIdToPromote },
			},
		});

		if (!channelUserToPromote) {
			throw new Error("User is not a member of this channel");
		}

		channelUserToPromote.role = UserRole.ADMIN;
		await this.channelUserRepository.save(channelUserToPromote);
	}

	async demoteFromAdmin(
		channelId: number,
		adminOrOwnerId: number,
		userIdToDemote: number
	): Promise<void> {
		const hasRights = await this.hasAdminRights(channelId, adminOrOwnerId);

		if (!hasRights) {
			throw new Error(
				"Only the owner or an admin can demote a user from admin"
			);
		}

		const channelUserToDemote = await this.channelUserRepository.findOne({
			where: {
				channel: { id: channelId },
				user: { id: userIdToDemote },
			},
		});

		if (!channelUserToDemote) {
			throw new Error("User is not a member of this channel");
		}

		channelUserToDemote.role = UserRole.MEMBER;
		await this.channelUserRepository.save(channelUserToDemote);
	}

	async kickUser(
		channelId: number,
		adminOrOwnerId: number,
		userIdToKick: number
	): Promise<void> {
		const hasRights = await this.hasAdminRights(channelId, adminOrOwnerId);

		if (!hasRights) {
			throw new Error("Only an admin or the owner can kick a user");
		}

		const channelUserToKick = await this.channelUserRepository.findOne({
			where: { channel: { id: channelId }, user: { id: userIdToKick } },
		});

		if (!channelUserToKick) {
			throw new Error("User is not a member of this channel");
		}

		if (channelUserToKick.role === UserRole.OWNER) {
			throw new Error("Cannot kick the owner of the channel");
		}

		await this.channelUserRepository.remove(channelUserToKick);
	}

	async isUserBannedFromChannel(
		userId: number,
		channelId: number
	): Promise<boolean> {
		// console.log(
		// 	"isUserBannedFromChannel, userId:",
		// 	userId,
		// 	"channelId:",
		// 	channelId
		// );
		const channelUserRecord = await this.channelUserRepository.findOne({
			where: {
				user: { id: userId },
				channel: { id: channelId },
			},
		});

		if (!channelUserRecord) {
			// throw new NotFoundException("User or channel couldn't be found.");
			return false;
		}
		return channelUserRecord.isBanned;
	}

	async banUser(
		channelId: number,
		adminOrOwnerId: number,
		userIdToBan: number
	): Promise<void> {
		const hasRights = await this.hasAdminRights(channelId, adminOrOwnerId);

		if (!hasRights) {
			throw new Error("Only an admin or the owner can ban a user");
		}

		const channelUserToBan = await this.channelUserRepository.findOne({
			where: { channel: { id: channelId }, user: { id: userIdToBan } },
		});

		if (!channelUserToBan) {
			throw new Error("User is not a member of this channel");
		}

		if (channelUserToBan.role === UserRole.OWNER) {
			throw new Error("Cannot ban the owner of the channel");
		}

		channelUserToBan.isBanned = true;
		await this.channelUserRepository.save(channelUserToBan);
	}

	async muteUser(
		channelId: number,
		adminOrOwnerId: number,
		userIdToMute: number,
		muteDuration: number
	): Promise<void> {
		const hasRights = await this.hasAdminRights(channelId, adminOrOwnerId);

		if (!hasRights) {
			throw new Error("Only an admin or the owner can mute a user");
		}

		const channelUserToMute = await this.channelUserRepository.findOne({
			where: { channel: { id: channelId }, user: { id: userIdToMute } },
		});

		if (!channelUserToMute) {
			throw new Error("User is not a member of this channel");
		}

		if (channelUserToMute.role === UserRole.OWNER) {
			throw new Error("Cannot mute the owner of the channel");
		}

		// Set the mute duration
		channelUserToMute.mutedUntil = new Date(
			Date.now() + muteDuration * 1000
		); // muteDuration is in seconds
		await this.channelUserRepository.save(channelUserToMute);
	}
}
