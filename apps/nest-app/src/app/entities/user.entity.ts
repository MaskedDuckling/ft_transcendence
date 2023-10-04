import {
	Column,
	Entity,
	Index,
	OneToMany,
	OneToOne,
	PrimaryGeneratedColumn,
} from "typeorm";
import { TokenData } from "../../auth/interfaces/tokenData.interface";
import { BlockedUser } from "./blockedUser.entity";
import { ChannelUser } from "./channelUser.entity";
import { DirectMessage } from "./directMessage.entity";
import { Friendship } from "./friendship.entity";
import { MatchHistory } from "./matchHistory.entity";
import { UserStats } from "./userStats.entity";
import { IsOptional, MaxLength } from "class-validator";

export enum UserStatus {
	ONLINE = "Online",
	OFFLINE = "Offline",
	INQUEUE = "In Queue",
	INGAME = "In-Game",
	INTRAINING = "In Training",
}

@Entity("user")
@Index(["oauth_user_id"])
export class User {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ nullable: true, unique: true })
	username!: string;

	@Column({ nullable: true, unique: true })
	email!: string;

	@Column({ nullable: true })
	avatar!: string;

	@Column({ nullable: true, type: "json" })
	private two_factor_secret!: string | null;

	get twoFactorSecret(): [string, boolean] | null {
		return this.two_factor_secret !== null
			? JSON.parse(this.two_factor_secret)
			: null;
	}

	set twoFactorSecret(value: [string, boolean] | null) {
		if (value === null) {
			this.two_factor_secret = null;
		} else {
			this.two_factor_secret = JSON.stringify(value);
		}
	}

	@Column({ type: "varchar", length: 30, nullable: true })
	@IsOptional()
	@MaxLength(30, {
		message: "Quote is too long! Maximum length is 30 characters.",
	})
	quote!: string;

	@Column({ type: "enum", enum: UserStatus, default: UserStatus.OFFLINE })
	status!: UserStatus;

	@Column({ type: "json", nullable: true })
	tokenData!: TokenData;

	@Column({ nullable: true })
	oauth_user_id!: string;

	// Relationships
	@OneToMany(() => Friendship, (friendship) => friendship.user)
	friendships!: Friendship[];

	@OneToOne(() => UserStats, (userStats) => userStats.user)
	userStats!: UserStats;

	@OneToMany(() => MatchHistory, (matchHistory) => matchHistory.user1)
	matchHistoriesAsPlayer1!: MatchHistory[];

	@OneToMany(() => MatchHistory, (matchHistory) => matchHistory.user2)
	matchHistoriesAsPlayer2!: MatchHistory[];

	@OneToMany(() => ChannelUser, (channelUser) => channelUser.user)
	channelUsers!: ChannelUser[];

	@OneToMany(() => DirectMessage, (directMessage) => directMessage.sender)
	sentDirectMessages!: DirectMessage[];

	@OneToMany(() => DirectMessage, (directMessage) => directMessage.recipient)
	receivedDirectMessages!: DirectMessage[];

	@OneToMany(() => BlockedUser, (blockedUser) => blockedUser.blocker)
	blockedUsers!: BlockedUser[];
}
