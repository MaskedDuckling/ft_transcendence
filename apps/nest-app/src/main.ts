import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app/app.module";
import { ValidationExceptionFilter } from "./common/filters/validation-exception.filter";
import { join } from "path";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as express from "express";
import { sessionMiddleware } from "./app/sessionMiddleware";
import { UserService } from "./app/service/user.service";
import { ChannelService } from "./app/service/channel.service";
import { NotFoundException } from "@nestjs/common";
import { ChannelType } from "./app/entities/channel.entity";
import * as fs from "fs";
import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';

async function checkAdminUser(userService: UserService) {
	//TODO: mettre un admin username dans le .env
	const user = await userService.getUserFromOauthUser("tallal--");
	if (!user) {
		try {
			await userService.createUserWithLogin("tallal--");
		} catch (error) {
			console.error("Error during checkAdminUser:", error);
		}
	}
}

async function checkGeneralChannel(
	channelService: ChannelService,
	userService: UserService
) {
	try {
		const channel = await channelService.getChannelbyName("General");
	} catch (error) {
		const user = await userService.getUserFromOauthUser("tallal--");
		if (!user) {
			console.error("Error not found");
			return;
		}
		await channelService.createChannel(
			"General",
			user?.id,
			ChannelType.PUBLIC,
			""
		);
		console.error("Error during checkGeneralChannel:", error);
	}
}

async function setAllUsersToOffline(userService: UserService) {
	try {
		await userService.setAllUsersOffline();
	} catch (error) {
		console.error("Error setting all users to offline:", error);
	}
}

async function bootstrap() {
	
	if (
		!process.env.PORT ||
		!process.env.SESSION_SECRET ||
		!process.env.REACT_URL
	) {
		throw new Error("Missing necessary environment variables");
	}
	const httpsOptions: HttpsOptions = {
		key: fs.readFileSync('/app/certs/cert.key'),
		cert: fs.readFileSync('/app/certs/cert.crt'),
	  };
	  
	const app = await NestFactory.create<NestExpressApplication>(AppModule, { httpsOptions });
	app.enableCors({
		origin: process.env.REACT_URL,
		methods: ["GET", "POST"],
		credentials: true,
	});

	const userService = app.get(UserService);
	const channelService = app.get(ChannelService);

	// Utilisez ces instances dans d'autres fonctions
	await setAllUsersToOffline(userService); //met tous les utilisateurs hors ligne
	await checkAdminUser(userService);
	await checkGeneralChannel(channelService, userService);

	app.use(sessionMiddleware);
	app.use("/uploads", express.static(join(process.cwd(), "public/uploads")));
	app.useGlobalFilters(new ValidationExceptionFilter());

	await app.listen(process.env.PORT);
	
}

bootstrap();
