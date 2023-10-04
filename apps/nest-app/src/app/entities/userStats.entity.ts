import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	OneToOne,
	JoinColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity()
export class UserStats {
	@PrimaryGeneratedColumn()
	id!: number;

	@OneToOne(() => User)
	@JoinColumn()
	user!: User;

	@Column()
	victories!: number;

	@Column()
	defeats!: number;

	@Column({ type: "float", nullable: true })
	winRate!: number;

	@Column()
	rank!: number;

	@Column()
	level!: number;

	@Column({ nullable: true })
	achievements!: string;
}
