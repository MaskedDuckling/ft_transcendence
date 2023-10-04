import {
	BadRequestException,
	Body,
	Controller,
	Get,
	NotFoundException,
	Post,
	Query,
	Req,
	Res,
	UploadedFile,
	UseInterceptors
} from "@nestjs/common";
import { FileInterceptor, MulterModuleOptions } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { promises as fsPromises } from "fs";
import { diskStorage } from "multer";
import { User } from "../../app/entities/user.entity";
import { UserService } from "../../app/service/user.service";
import { AuthService } from "../service/auth.service";

interface GetAvatarResponseBody {
	username: string,
	avatar?: string
}

const avatarUploadOptions: MulterModuleOptions = {
	storage: diskStorage({
		destination: "./public/uploads",
		filename: (req, file, callback) => {
			const uniqueSuffix =
				Date.now() + "-" + Math.round(Math.random() * 1e9);
			const extension = file.originalname.split(".").pop();
			const filename = `${uniqueSuffix}.${extension}`;
			callback(null, filename);
		},
	}),
	limits: {
		fileSize: 8 * 1000000, // 8 MB
	},
};

@Controller("auth")
export class AuthController {
	constructor(
		private authService: AuthService,
		private userService: UserService
	) { }

	@Post("42")
	async verification(
		@Body() body: { code: string },
		@Req() req: Request,
		@Res() res: Response
	): Promise<any> {
		try {
			const tokenData = await this.authService.getAccessToken(body.code);
			const userInfo = await this.authService.getUserInfo(
				tokenData.access_token
			);

			res.setHeader("Content-Type", "application/json");
			if (userInfo) {
				const user = await this.authService.getOrCreateUser(
					tokenData,
					userInfo
				);

				//si 2fa est actif sur ce user, on le redirige vers la page de 2fa (comme ca l'insertion de l'id dans la sessions ne ce fait que dans ce cas la)
				userInfo["twoFAEnabled"] = false;
				if (user.username !== null) {
					userInfo["username"] = user.username;
					if (await this.userService.isTwoFAEnabled(user)) {
						console.log("2FA enabled");
						userInfo["twoFAEnabled"] = true;
						//dans le cas ou il a deja mis le code 2fa dans la sessions mais qui'il repasse par la page de login
						if (req.session["twoFASuccess"] === true) {
							userInfo["twoFAEnabled"] = false;
						}

						// res.send(JSON.stringify(userInfo));
						res.json(userInfo);
						return;
					}
				}
				req.session["userId"] = { userId: user.id };
				res.send(userInfo);
				return;
			}
		} catch (error) {
			res.json(error);
		}
	}

	@Get("usernameChecker")
	async usernameChecker(@Query("username") username: string, @Res() res) {
		// console.log("usernameChecker called with", username);

		if (!username) {
			// console.log("Username is not provided");
			return res.json({ error: "username not found in params" });
		}

		try {
			const check = await this.authService.usernameChecker(username);
			res.json(check);
		} catch (error) {
			// console.log("Error in usernameChecker", error);
			res.json(error);
		}
	}

	@Post("createUser")
	@UseInterceptors(FileInterceptor("avatar", avatarUploadOptions))
	async createUser(
		@UploadedFile() file: Express.Multer.File,
		@Req() req: Request,
		@Body("username") username: string,
		@Res() response: Response
	): Promise<User | { isUsernameTaken: string } | Response> {
		const user = req.user;
		// Vérifier si le champ username est vide
		if (!username) {
			if (file && file.path) {
				await fsPromises.unlink(file.path);
			}
			response.status(400).send(JSON.stringify({ error: "No username" }));
		}
		const usernameVerif = await this.authService.isValidUsername(username);
		if (usernameVerif) {
			return { isUsernameTaken: usernameVerif };
		}
		const isValidImage = await this.authService.isImage(file.path);
		if (!isValidImage) {
			await fsPromises.unlink(file.path);
			return response
				.status(400)
				.send(JSON.stringify({ error: "Invalid image type" }));
		}
		if (!user || user.username) {
			if (file && file.path) {
				await fsPromises.unlink(file.path);
			}
			if (!user)
				return response
					.status(403)
					.send(JSON.stringify({ error: "User session not found" }));
			return response
				.status(400)
				.send(JSON.stringify({ error: "User already has a username" }));
		}
		//verifier si le username est deja pris
		const userExists = await this.userService.getUserFromUsername(username);
		if (userExists !== null) {
			if (file && file.path) {
				await fsPromises.unlink(file.path);
			}
			throw new BadRequestException("Le username est deja pris");
		}
		await this.authService.cropImage(file.path);
		// Créer l'utilisateur
		response.setHeader("Content-Type", "application/json");
		response.json(
			await this.authService.registerUser(
				file,
				username,
				user.oauth_user_id
			)
		);
		return response;
	}

	@Post("avatarUpdate")
	@UseInterceptors(FileInterceptor("avatar", avatarUploadOptions))
	async avatarUpdate(
		@UploadedFile() file: Express.Multer.File,
		@Req() req: Request,
		@Res() res: Response
	) {
		const user = req.user;
		res.setHeader("Content-Type", "application/json");
		if (!file || !file.path) {
			res.status(400).send(JSON.stringify({ error: "file not found" }));
			return;
		}
		const isValidImage = await this.authService.isImage(file.path);
		if (!isValidImage) {
			await fsPromises.unlink(file.path);
			res.status(400).send(
				JSON.stringify({ error: "Invalid image type" })
			);
			return;
		}
		if (!user || !user.username) {
			if (file && file.path) {
				await fsPromises.unlink(file.path);
			}
			res.status(403).send(
				JSON.stringify({ error: "User session not found" })
			);
			return;
		}
		await this.authService.cropImage(file.path);
		const avatar = await this.authService.updateAvatar(file, user);
		res.send(JSON.stringify({ avatar: avatar }));
	}

	@Get("checkAuthentication")
	async checkAuthentication(@Req() req: Request, @Res() res: Response) {
		const user = req.user;
		res.setHeader("Content-Type", "application/json");
		const userId = req.session["userId"]?.userId;
		let response = { authenticated: false };
		if (userId) {
			response.authenticated = true;
			response["username"] = user?.username;
			response["avatar"] = user?.avatar;
		}
		res.send(JSON.stringify(response));
	}

	@Get("myInfos")
	async myInfos(@Req() req: Request, @Res() res: Response) {
		const user = req.user;
		if (!user) {
			throw new NotFoundException("User not found");
		}
		res.setHeader("Content-Type", "application/json");

		if (user === undefined || user.username === undefined) {
			res.status(403).send(
				JSON.stringify({ error: "User session not found" })
			);
			return;
		}

		res.setHeader("Content-Type", "application/json");
		let avatar_url = "";
		if (user.avatar) {
			avatar_url = process.env.NEST_URL + "/uploads/" + user.avatar;
		}
		const myInfos = {
			username: user.username,
			avatar: avatar_url,
			login: user.oauth_user_id,
		};
		res.send(JSON.stringify(myInfos));
	}

	@Get("getavatar")
	async getavatar(
		@Req() req: Request,
		@Res() res: Response<GetAvatarResponseBody>,
		@Query("username") username: string
	) {
		if (!username) {
			res.status(400);
			return;
		}
		const user = await this.userService.getUserFromUsername(username);
		if (user === null) {
			res.status(403);
			return;
		}
		res.setHeader("Content-Type", "application/json");
		if (user.avatar === undefined) {
			res.status(403);
			return;
		}
		const avatar = process.env.NEST_URL + "/uploads/" + user.avatar;

		res.send({
			avatar,
			username,
		});
	}

	//TODO: WILL BE REMOVED
	//fake login for dev (it will be removed) -> receive a userid and store it in session
	@Post("fakelogin")
	async fakeLogin(
		@Body("userid") userid: string,
		@Req() req: Request,
		@Res() res: Response
	) {
		res.setHeader("Content-Type", "application/json");
		if (!userid) {
			res.status(400).send({ error: "No userid provided" });
			return;
		}
		if (!parseInt(userid)) {
			res.status(400).send({ error: "Userid is not a number" });
			return;
		}
		const useridnum = parseInt(userid);
		const user = await this.userService.getUserById(useridnum);
		if (!user) {
			res.status(400).send({ error: "User not found" });
			return;
		}
		req.session["userId"] = { userId: userid };
		res.send(user);
	}
	//TODO: WILL BE REMOVED
	//send the userlist, containing all the users id and username, will be used to select the user to connect for dev (it will be removed)
	@Get("/userlist")
	async getUserList(@Req() req: Request, @Res() res: Response) {
		res.header("Content-Type", "application/json");
		const users = await this.userService.getAllIdAndUsername();
		const userList = users.map((user) => {
			return { id: user.id, username: user.username };
		});
		res.send(userList);
	}
}
