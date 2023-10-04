import { Controller, Get, Res } from "@nestjs/common";
import { AppService } from "../service/app.service";
import { Response } from "express";

@Controller()
export class AppController {
	constructor(private readonly appService: AppService) {}

	@Get("test")
	async test(): Promise<any> {
		const res = "test";
		return res;
	}

	@Get("keep-alive-endpoint")
	keepAlive(@Res() res: Response) {
		// Avec rolling: true, express-session renouvellera le cookie à chaque requête
		res.setHeader("Content-Type", "application/json");
		res.send(JSON.stringify("session refreshed"));
	}
}
