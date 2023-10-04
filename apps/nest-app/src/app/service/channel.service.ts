import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Channel, ChannelType } from "../entities/channel.entity";
import * as bcrypt from "bcrypt";
import { Raw } from "typeorm";

@Injectable()
export class ChannelService {
	constructor(
		@InjectRepository(Channel)
		private channelRepository: Repository<Channel>
	) {}

	async createChannel(
		channelName: string,
		channelOwnerId: number,
		channelType: ChannelType,
		channelPassword: string
	): Promise<Channel> {
		const newChannel = this.channelRepository.create({
			name: channelName,
			ownerId: channelOwnerId,
			type: channelType,
			password: channelPassword,
		});

		return await this.channelRepository.save(newChannel);
	}

	async getChannelbyName(channelName: string): Promise<Channel> {
		const channel = await this.channelRepository.findOne({
			where: { name: channelName },
		});
		if (!channel) {
			throw new NotFoundException("Channel not found");
		}
		return channel;
	}

	async getChannelbyNormalizedName(
		channelName: string
	): Promise<Channel | null> {
		const normalizedChannelName = channelName.toLowerCase();
		const channel = await this.channelRepository.findOne({
			where: {
				name: Raw(
					(columnAlias) => `LOWER(${columnAlias}) = LOWER(:name)`,
					{ name: normalizedChannelName }
				),
			},
		});
		if (!channel) {
			return null;
		}
		return channel;
	}

	// async updateChannelPassword(
	// 	channelId: number,
	// 	newPassword?: string
	// ): Promise<Channel> {
	// 	const channel = await this.channelRepository.findOne({
	// 		where: { id: channelId },
	// 	});

	// 	if (!channel) {
	// 		throw new NotFoundException("Channel not found.");
	// 	}

	// 	if (newPassword) {
	// 		// Hash the new password using bcrypt or your preferred hashing library
	// 		const hashedPassword = await bcrypt.hash(newPassword, 10);

	// 		channel.password = hashedPassword;
	// 		channel.type = ChannelType.PASSWORD_PROTECTED;
	// 	} else {
	// 		channel.password = null;
	// 		channel.type = ChannelType.PUBLIC;
	// 	}

	// 	return await this.channelRepository.save(channel);
	// }
	async updateChannelPassword(
		channelId: number,
		newPassword: string
	): Promise<Channel> {
		const channel = await this.channelRepository.findOne({
			where: { id: channelId },
		});

		if (!channel) {
			throw new NotFoundException("Channel not found.");
		}

		// Hash the new password using bcrypt or your preferred hashing library
		const hashedPassword = await bcrypt.hash(newPassword, 10);

		channel.password = hashedPassword;
		channel.type = ChannelType.PASSWORD_PROTECTED;

		// Save and return the updated channel
		return await this.channelRepository.save(channel);
	}

	async updateChannelType(
		channelId: number,
		newType: ChannelType
	): Promise<Channel> {
		const channel = await this.channelRepository.findOne({
			where: { id: channelId },
		});

		if (!channel) {
			throw new NotFoundException("Channel not found.");
		}

		channel.type = newType;

		return await this.channelRepository.save(channel);
	}
}
