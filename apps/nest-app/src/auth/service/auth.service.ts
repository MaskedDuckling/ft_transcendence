import { BadRequestException, Injectable, UploadedFile } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import * as qs from "qs";
import { User } from "../../app/entities/user.entity";
import { UserService } from "../../app/service/user.service";
import { AccessTokenDto } from "../dto/auth.dto";
import { TokenData } from "../interfaces/tokenData.interface";
import sharp from "sharp";
import { readFile } from "fs/promises";
import { promises as fsPromises } from "fs";
import { join } from "path";


async function moveFile(src: string, dest: string): Promise<void> {
	await fsPromises.copyFile(src, dest);
	await fsPromises.unlink(src);
  }

@Injectable()
export class AuthService {
	constructor(
		private configService: ConfigService,
		private userService: UserService
	) {}

	async getAccessToken(code: string): Promise<TokenData> {
		try {
			const data = qs.stringify({
				grant_type: "authorization_code",
				client_id: process.env.SCHOOL_ID,
				client_secret: process.env.SCHOOL_SECRET,
				code: code,
				redirect_uri: process.env.REACT_URL + "/LoginRedirect",
			});
			const response = await axios.post(
				"https://api.intra.42.fr/v2/oauth/token",
				data,
				{
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
				}
			);

			if (typeof response.data !== "object" || response.data === null) {
				throw new Error("Response is not a valid JSON object");
			}
			//const AccessTokenDto = response;
			const tokenData = response.data;
			const accessTokenDto = plainToClass(AccessTokenDto, tokenData);
			const validationErrors = await validate(accessTokenDto);
			if (validationErrors.length > 0) {
				// erreurs de validation ici
				throw new BadRequestException(validationErrors);
			}
			return tokenData;
		} catch (error) {
			throw error;
		}
	}

	async getUserInfo(accessToken: string): Promise<SchoolUserData> {
		try {
			const response = await axios.get("https://api.intra.42.fr/v2/me", {
				headers: { Authorization: `Bearer ${accessToken}` },
			});

			const userInfo = response.data;
			return userInfo;
		} catch (error) {
			throw error;
		}
	}

	async getOrCreateUser(
		tokenData: TokenData,
		schoolUserData: SchoolUserData
	): Promise<User> {
		try {
			const login = schoolUserData.login;
			let user = await this.userService.getUserFromOauthUser(login);
			if (user) {
				await this.userService.updateTokenDataWithOauthUser(
					login,
					tokenData
				);
				return user;
			} else {
				user = await this.userService.createUserWithToken(
					login,
					tokenData
				);
				return user;
			}
		} catch (error) {
			console.error(error);
			throw error;
		}
	}
	isValidUsername(username: string): string {
		if (username.length > 9) {
			return "The user name cannot exceed 9 characters";
		}
		if (username.length < 3) {
			return "The username must be at least 3 characters long";
		}
		if (!/^[a-zA-Z0-9_]+$/.test(username)) {
			return "The username must contain only letters, numbers and underscores";
		}
		if (
			username == "admin" ||
			username == "administrator" ||
			username == "server" ||
			username == "root" ||
			username == "moderator" ||
			username == "mod"
		) {
			return "The username is reserved";
		}
		return "";
	}

	async usernameChecker(
		username: string
	): Promise<boolean | { isUsernameTaken: string }> {
		try {
			const normalizedUsername = username.toLowerCase(); // Normaliser la casse du username
			const usernameValidationError =
				this.isValidUsername(normalizedUsername);
			if (usernameValidationError) {
				return { isUsernameTaken: usernameValidationError };
			}
			const user = await this.userService.getUserFromNormalizedUsername(
				normalizedUsername
			);
			if (user) {
				return {
					isUsernameTaken: "The user name is already taken",
				};
			} else {
				return false;
			}
		} catch (error) {
			console.error(error);
			throw error;
		}
	}

	async registerUser(
		@UploadedFile() file: Express.Multer.File,
		username: string,
		login: string
	) {
		try {
			const avatarUrl = file.path;
			const newUser = await this.userService.updateUsernameAndAvatar(
				avatarUrl,
				username,
				login
			);
			return newUser;
		} catch (error) {
			console.error(
				"Erreur lors de la création de l'utilisateur : ",
				error
			);
			throw error;
		}
	}

	async updateAvatar(
		@UploadedFile() file: Express.Multer.File,
		username: User
	): Promise<User> {
		try {
			const avatarUrl = file.path;
			const newUser = await this.userService.updateAvatar(
				avatarUrl,
				username
			);
			return newUser;
		} catch (error) {
			console.error(
				"Erreur lors de la création de l'utilisateur : ",
				error
			);
			throw error; // répercuter l'erreur pour la gérer au niveau du contrôleur
		}
	}
	async isImage(filePath: string): Promise<boolean> {
		const magicNumbers = {
			png: "89504e47",
			jpeg: "ffd8ffe0",
			jpg: "ffd8ffe1",
			webp: "52494646",
		};

		try {
			const buffer = await readFile(filePath);
			const fileTypeFromBuffer = buffer.toString("hex", 0, 4);
			// console.log("fileTypeFromBuffer", fileTypeFromBuffer);
			return Object.values(magicNumbers).includes(fileTypeFromBuffer);
		} catch (err) {
			console.error("Error reading file:", err);
			return false;
		}
	}

	async cropImage(filePath: string): Promise<void> {
		const image = sharp(filePath);
	
		const metadata = await image.metadata();
	
		if (!metadata.width || !metadata.height) {
			throw new Error("Invalid image dimensions");
		}
	
		const minLength = Math.min(metadata.width, metadata.height);
		const offsetX = Math.round((metadata.width - minLength) / 2);
		const offsetY = Math.round((metadata.height - minLength) / 2);
	
		const tempFilePath = join(__dirname, "temp_crop_image.jpg");
	
		await image
			.extract({
				left: offsetX,
				top: offsetY,
				width: minLength,
				height: minLength,
			})
			.toFile(tempFilePath);
	
		// Remplacer l'image originale par l'image recadrée
		// await fsPromises.rename(tempFilePath, filePath);
		await moveFile(tempFilePath, filePath);
	}
}
