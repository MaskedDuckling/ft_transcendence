import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { ChannelUser } from "./channelUser.entity";

export enum ChannelType {
	PUBLIC = "public",
	PRIVATE = "private",
	PASSWORD_PROTECTED = "password_protected",
}

@Entity()
export class Channel {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column()
	name!: string;

	@Column()
	ownerId!: number;

	@Column({
		type: "enum",
		enum: ChannelType,
		default: ChannelType.PUBLIC,
	})
	type!: ChannelType;

	@Column({ type: "text", nullable: true })
	password!: string | null; // Hashed

	@OneToMany(() => ChannelUser, (channelUser) => channelUser.channel)
	channelUsers!: ChannelUser[];
}
