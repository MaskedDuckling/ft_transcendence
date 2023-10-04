import { Injectable } from "@nestjs/common";
import { SecretCode } from "../interfaces/secretCode.interface";
import * as qrcode from "qrcode";
import * as speakeasy from "speakeasy";

@Injectable()
export class TwoFAService {
	async generateQrCode(secret: string, username: string): Promise<string> {
		try {
			const url = "otpauth://totp/" + username + "?secret=" + secret;
			const dataUrl = await qrcode.toDataURL(url, {
				errorCorrectionLevel: "H",
				type: "image/jpeg",
				width: 300,
				margin: 2,
			});
			return dataUrl;
		} catch (error) {
			console.error("Erreur lors de la génération du QR code :", error);
			throw error;
		}
	}

	async generateSecretCode(username: string): Promise<SecretCode> {
		const code = speakeasy.generateSecret();
		const qr = await this.generateQrCode(code.base32, username);
		const secretCode: SecretCode = {
			secret: code.base32,
			qrCode: qr,
		};
		return secretCode;
	}
}
