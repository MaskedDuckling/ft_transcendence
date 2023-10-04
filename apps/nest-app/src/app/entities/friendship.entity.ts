import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from "typeorm";
import { User } from "./user.entity";

export enum FriendshipStatus {
	NONEXISTENT = "non-existent",
	PENDING = "pending",
	ACCEPTED = "accepted",
	DECLINED = "declined",
	BLOCKED = "blocked",
}

@Entity()
export class Friendship {
	@PrimaryGeneratedColumn()
	id!: number;

	@ManyToOne(() => User)
	user!: User;

	@ManyToOne(() => User)
	friend!: User;

	@Column({
		type: "enum",
		enum: FriendshipStatus,
		default: FriendshipStatus.NONEXISTENT,
	})
	status!: FriendshipStatus;
}
