import {
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import fs, { promises as fsPromises } from "fs";
import * as speakeasy from "speakeasy";
import { ILike, Repository } from "typeorm";
import { TokenData } from "../../auth/interfaces/tokenData.interface";
import { User, UserStatus } from "../entities/user.entity";


async function moveFile(src: string, dest: string): Promise<void> {
	await fsPromises.copyFile(src, dest);
	await fsPromises.unlink(src);
  }


@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User) private userServiceRepository: Repository<User>
	) {}

	async createUserWithToken(login: string, token: TokenData): Promise<User> {
		const user = new User();
		user.tokenData = token;
		user.oauth_user_id = login;
		return await this.userServiceRepository.save(user);
	}

	async createUserWithLogin(login: string): Promise<User> {
		const user = new User();
		user.oauth_user_id = login;
		return await this.userServiceRepository.save(user);
	}

	async updateUserQuote(userId: number, quote: string): Promise<User> {
		if (quote.length > 30) {
			throw new Error(
				"Quote is too long! Maximum length is 30 characters."
			);
		}
		const user = await this.userServiceRepository.findOne({
			where: { id: userId },
		});
		if (!user) {
			throw new NotFoundException("User not found");
		}

		user.quote = quote;
		return await this.userServiceRepository.save(user);
	}

	async updateTokenDataWithOauthUser(
		login: string,
		token: TokenData
	): Promise<User> {
		const user = await this.userServiceRepository.findOne({
			where: { oauth_user_id: login },
		});
		if (!user) {
			throw new NotFoundException("User not found");
		}
		user.tokenData = token;
		return await this.userServiceRepository.save(user);
	}

	async getAllIdAndUsername(): Promise<User[]> {
		return await this.userServiceRepository.find({
			select: ["id", "username"],
		});
	}
	async getUserById(userId: number): Promise<User> {
		const numUserId = Number(userId);
		if (isNaN(numUserId)) {
			throw new Error("userId must be a number");
		}
		const user = await this.userServiceRepository.findOne({
			where: { id: numUserId },
		});
		if (!user) {
			throw new NotFoundException("User not found");
		}
		return user;
	}

	async getUserFromOauthUser(login: string): Promise<User | null> {
		return await this.userServiceRepository.findOne({
			where: { oauth_user_id: login },
		});
	}

	async getUserFromUsername(username: string): Promise<User | null> {
		return await this.userServiceRepository.findOne({
			where: { username: username },
		});
	}

	async setAllUsersOffline(): Promise<void> {
		try {
			await this.userServiceRepository.update(
				{},
				{ status: UserStatus.OFFLINE }
			);
		} catch (error) {
			console.error("Error while setting all users to offline:", error);
			throw new InternalServerErrorException(
				"Failed to set all users offline"
			);
		}
	}

	async getUserFromNormalizedUsername(
		normalizedUsername: string
	): Promise<User | null> {
		const user = await this.userServiceRepository.findOne({
			where: {
				username: ILike(normalizedUsername),
			},
		});
		if (!user) {
			return null;
		}
		return user;
	}

	async updateUserStatus(
		userId: number,
		newStatus: UserStatus
	): Promise<User> {
		const user = await this.userServiceRepository.findOne({
			where: { id: userId },
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		user.status = newStatus;
		return await this.userServiceRepository.save(user);
	}

	async updateUsernameAndAvatar(
		file: string,
		username: string,
		login: string
	) {
		const user = await this.userServiceRepository.findOne({
			where: { oauth_user_id: login },
		});

		if (!user) {
			throw new NotFoundException("User not found");
		}

		user.username = username;

		const avatarFileName = `${username}.${file.split(".").pop()}`;
		const avatarPath = `./public/uploads/${avatarFileName}`;

		try {
			// await fsPromises.rename(file, avatarPath); // Déplacer le fichier temporaire vers l'emplacement permanent
			await moveFile(file, avatarPath);
			user.avatar = avatarFileName; // Stocker le nom de fichier de l'avatar dans la base de données
			await this.userServiceRepository.save(user);
			return user;
		} catch (error) {
			console.error("Erreur lors du déplacement de l'avatar : ", error);
			throw new InternalServerErrorException(
				"Erreur lors du déplacement de l'avatar"
			);
		}
	}

	async updateAvatar(file: string, user: User) {
		if (!user) {
			throw new NotFoundException("User not found");
		}
		const oldAvatarPath = `./public/uploads/${user.avatar}`;
		const avatarFileName = `${user.username}.${file.split(".").pop()}`;
		const newAvatarPath = `./public/uploads/${avatarFileName}`;
		// console.log(
		// 	"Lets update avatar of user : ",
		// 	user.username,
		// 	" with file : ",
		// 	file,
		// 	" and new path : ",
		// 	newAvatarPath,
		// 	" and old path : ",
		// 	oldAvatarPath
		// );
		try {
			// Supprimer l'ancienne image d'avatar si elle existe
			if (user.avatar !== null) {
				try {
					await fsPromises.access(oldAvatarPath, fs.constants.F_OK);
					// Si aucun erreur n'est levée par fsPromises.access(), le fichier existe, donc on peut le supprimer
					await fsPromises.unlink(oldAvatarPath);
				} catch (error) {
					// Si une erreur est levée, cela signifie que le fichier n'existe pas, donc rien à faire ici
				}
			}
			// await fsPromises.rename(file, newAvatarPath); // Déplacer le fichier temporaire vers l'emplacement permanent
			await moveFile(file, newAvatarPath);
			user.avatar = avatarFileName; // Stocker le nom de fichier de l'avatar dans la base de données
			await this.userServiceRepository.save(user);
			return user;
		} catch (error) {
			console.error(
				"Error while updating avatar:",
				error
			);
			throw new InternalServerErrorException(
				"Erreur lors de la mise à jour de l'avatar"
			);
		}
	}

	async updateTwoFASecretByUser(
		user: User,
		secret: [string, boolean]
	): Promise<void> {
		if (user) {
			user.twoFactorSecret = secret;
			await this.userServiceRepository.save(user);
		} else {
			throw new NotFoundException("User not found");
		}
	}

	async updateTwoFASecretBoolByUser(
		user: User,
		bool: boolean
	): Promise<void> {
		if (user) {
			const { twoFactorSecret } = user;
			if (twoFactorSecret === null) {
				throw new Error("Should never occurs twoFactorSecret is null");
			}
			user.twoFactorSecret = [twoFactorSecret[0], bool];
			await this.userServiceRepository.save(user);
		} else {
			throw new NotFoundException("User not found");
		}
	}

	async removeTwoFAByUser(user: User): Promise<void> {
		if (user && user.twoFactorSecret && user.twoFactorSecret[1]) {
			user.twoFactorSecret = null;
			await this.userServiceRepository.save(user);
		} else {
			throw new NotFoundException("User not found");
		}
	}

	async verifyTwoFACode(
		username: string,
		authCode: string
	): Promise<boolean> {
		const user = await this.userServiceRepository.findOne({
			where: { username },
		});
		if (!user || !user.twoFactorSecret) {
			throw new NotFoundException("User not found");
		}
		const isValid = speakeasy.totp.verify({
			secret: user.twoFactorSecret[0],
			encoding: "base32",
			token: authCode,
			window: 1, // Fenêtre de validation d'une période de 30 secondes avant et après le code attendu
		});
		return isValid;
	}

	async hasUsername(user: User): Promise<boolean> {
		if (!user) {
			throw new NotFoundException("User not found");
		}
		return !!user.username;
	}

	async isTwoFAEnabled(user: User): Promise<boolean> {
		if (!user) {
			throw new NotFoundException("User not found");
		}
		if (user.twoFactorSecret == null) {
			return false;
		}
		return user.twoFactorSecret[1];
	}
}
