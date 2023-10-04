import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	ManyToOne,
	JoinColumn,
	Index,
} from "typeorm";
import { User } from "./user.entity";

@Entity()
@Index(["user1"])
@Index(["user2"])
export class MatchHistory {
	@PrimaryGeneratedColumn()
	id!: number;

	@ManyToOne(() => User)
	@JoinColumn({ name: "user_id_1" })
	user1!: User;

	@ManyToOne(() => User)
	@JoinColumn({ name: "user_id_2" })
	user2!: User;

	@Column({ default: false })
	outcome!: boolean;

	@Column()
	finalScore!: string;

	@Column("timestamptz")
	date!: Date;
}
