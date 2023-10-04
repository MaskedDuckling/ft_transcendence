import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from "typeorm";
import { Channel } from "./channel.entity";
import { User } from "./user.entity";

export enum UserRole {
	OWNER = "owner",
	ADMIN = "admin",
	MEMBER = "member",
}

@Entity()
export class ChannelUser {
	@PrimaryGeneratedColumn()
	id!: number;

	@ManyToOne(() => Channel, (channel) => channel.channelUsers)
	channel!: Channel;

	@ManyToOne(() => User)
	user!: User;

	@Column({
		type: "enum",
		enum: UserRole,
		default: UserRole.MEMBER,
	})
	role!: UserRole;

	@Column({ type: "boolean", default: false })
	isBanned!: boolean;

	@Column({ type: "timestamp", nullable: true })
	mutedUntil?: Date;
}
