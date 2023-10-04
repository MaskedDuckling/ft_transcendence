import { Entity, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { User } from "./user.entity";

@Entity()
export class BlockedUser {
	@PrimaryGeneratedColumn()
	id!: number;

	@ManyToOne(() => User)
	blocker!: User;

	@ManyToOne(() => User)
	blocked!: User;
}
