import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { UserService } from "./service/user.service"; // Importez le service UserService

@Injectable()
export class AttachUserMiddleware implements NestMiddleware {
	constructor(private userService: UserService) {}

	private async destroySession(req: Request, res: Response, message: string) {
		return new Promise<void>((resolve) => {
			req.session.destroy((err) => {
				if (err) {
					console.error(
						"Error while destroying session:",
						err
					);
				} else {
					console.log("Session successfuly destroyed");
				}
				res.status(401).send(message);
				resolve();
			});
		});
	}

	async use(req: Request, res: Response, next: NextFunction) {
		console.log("________________AttachUserMiddleware__________________");
		console.log("Request to URL: ", req.originalUrl);
		console.log(req.session);

		const userId = req.session["userId"]?.userId;

		if (userId) {
			try {
				const user = await this.userService.getUserById(userId);
				if (user) {
					req.user = user;
					next();
				} else {
					await this.destroySession(
						req,
						res,
						"Utilisateur non trouvé, session détruite"
					);
					return;
				}
			} catch (error) {
				await this.destroySession(
					req,
					res,
					"Erreur d'authentification, session détruite"
				);
				return;
			}
		} else {
			next();
		}
	}
}
