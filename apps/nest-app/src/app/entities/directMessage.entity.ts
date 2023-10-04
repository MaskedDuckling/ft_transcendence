import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { User } from "./user.entity";

@Entity()
export class DirectMessage {
	@PrimaryGeneratedColumn()
	id!: number;

	@ManyToOne(() => User)
	sender!: User;

	@ManyToOne(() => User)
	recipient!: User;

	@Column("text")
	messageContent!: string;

	@Column("timestamptz")
	sentTime!: Date;
}
