import { Module } from "@nestjs/common";
import { MiddlewareConsumer, NestModule } from "@nestjs/common/interfaces"; // Import from @nestjs/common/interfaces
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { PongGateway } from "../pong/pong.gateway";
import { BLNGateway } from "../bln/BLN.gateway";
import { UserStatusGateway } from "../userStatus/userStatus.gateway";
import { TwoFAModule } from "../TwoFA/TwoFA.module";
import { AttachUserMiddleware } from "./attach-user.middleware"; // Le chemin vers votre middleware
import { AppController } from "./controller/app.controller";
import { User } from "./entities/user.entity";
import { AppService } from "./service/app.service";
import { UserService } from "./service/user.service";
import { ProfileModule } from "../profile/profile.module";
import { MatchHistoryService } from "./service/matchHistory.service";
import { MatchHistory } from "./entities/matchHistory.entity";
import { UserStatsService } from "./service/userStats.service";
import { UserStats } from "./entities/userStats.entity";
import { ChannelService } from "./service/channel.service";
import { Channel } from "./entities/channel.entity";
import { ChannelUserService } from "./service/channelUser.service";
import { ChannelUser } from "./entities/channelUser.entity";
import { FriendshipService } from "./service/friendship.service";
import { Friendship } from "./entities/friendship.entity";

@Module({
	imports: [
		ConfigModule.forRoot(),
		TypeOrmModule.forFeature([
			User,
			MatchHistory,
			UserStats,
			Channel,
			ChannelUser,
			Friendship,
		]),
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => ({
				type: "postgres",
				host: configService.get<string>("DB_HOST"),
				port: Number(configService.get<string>("DB_PORT")),
				username: configService.get<string>("DB_USERNAME"),
				password: configService.get<string>("DB_PASSWORD"),
				database: configService.get<string>("DB_DATABASE"),
				schema: "public",
				entities: [__dirname + "/../**/*.entity{.ts,.js}"],
				synchronize: true,
			}),
			inject: [ConfigService],
		}),
		TwoFAModule,
		AuthModule,
		ProfileModule,
	],
	controllers: [AppController],
	providers: [
		AppService,
		UserService,
		MatchHistoryService,
		UserStatsService,
		ChannelService,
		ChannelUserService,
		FriendshipService,
		PongGateway,
		BLNGateway,
		UserStatusGateway,
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(AttachUserMiddleware).forRoutes("*");
	}
}
