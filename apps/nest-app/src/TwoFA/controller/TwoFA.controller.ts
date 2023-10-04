import {
	Controller,
	Post,
	Get,
	Res,
	Req,
	Body,
	BadRequestException,
} from "@nestjs/common";
import { TwoFAService } from "../service/TwoFA.service";
import { UserService } from "../../app/service/user.service";
import { Request, Response } from "express";

@Controller("2FA")
export class TwoFAController {
	constructor(
		private twoFAService: TwoFAService,
		private userService: UserService // Ajoutez cette ligne
	) {}

	@Post("generate")
	async generate(@Req() req: Request, @Res() res) {
		const user = req.user;
		if (!user || !user.username) {
			res.status(403).send(
				JSON.stringify({ error: "Session not found" })
			);
			return;
		}
		const secretCode = await this.twoFAService.generateSecretCode(
			user.username
		);
		const secret: [string, boolean] = [secretCode.secret, false];
		await this.userService.updateTwoFASecretByUser(user, secret);
		const isTwoFAEnabled = false;
		res.send({ secretCode, isTwoFAEnabled });
	}

	@Post("verify")
	async verify(
		@Body() body: { authCode: string; username: string },
		@Res() res,
		@Req() req: Request
	) {
		if (!body.username || !body.authCode)
			throw new BadRequestException("Code ou utilisateur invalide");
		const isValid = await this.userService.verifyTwoFACode(
			body.username,
			body.authCode
		);
		if (isValid) {
			const user = await this.userService.getUserFromNormalizedUsername(
				body.username
			);
			if (!user) {
				res.status(403).send(
					JSON.stringify({ error: "Session not found" })
				);
				return;
			}
			req.session["userId"] = { userId: user.id };
		}
		if (isValid) {
			req.session["twoFASuccess"] = true;
		}
		res.send({ isValid });
	}

	@Post("verifyAfterCreation")
	async verifyAfterCreation(
		@Body() body: { authCode: string },
		@Res() res,
		@Req() req: Request
	) {
		const user = req.user;
		if (!body.authCode) throw new BadRequestException("Code invalide");
		if (!user || !user.username) {
			res.status(403).send(
				JSON.stringify({ error: "Session not found" })
			);
			return;
		}
		const isValid = await this.userService.verifyTwoFACode(
			user.username,
			body.authCode
		);
		if (isValid) {
			req.session["twoFASuccess"] = true;
			await this.userService.updateTwoFASecretBoolByUser(user, true);
		}
		res.send({ isValid });
	}

	@Get("check")
	async checkTwoFAStatus(@Req() req: Request, @Res() res: Response) {
		const user = req.user;
		if (!user || !user.username) {
			res.status(403).send(
				JSON.stringify({ error: "Session not found" })
			);
			return;
		}
		const isTwoFAEnabled = await this.userService.isTwoFAEnabled(user);
		res.send(isTwoFAEnabled);
	}

	@Post("delete")
	async disableTwoFA(@Req() req: Request, @Res() res: Response) {
		const user = req.user;
		if (!user || !user.username) {
			res.status(403).send(
				JSON.stringify({ error: "Session not found" })
			);
			return;
		}
		await this.userService.removeTwoFAByUser(user);
		res.send(false);
	}
}
