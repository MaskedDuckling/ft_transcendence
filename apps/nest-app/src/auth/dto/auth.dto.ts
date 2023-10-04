import { IsString, IsInt, IsObject, Validate, IsDate } from "class-validator";

export class AuthDto {
	@IsString()
	code!: string;
}

export class AccessTokenDto {
	@IsString()
	access_token!: string;

	@IsString()
	token_type!: string;

	@IsInt()
	expires_in!: number;

	@IsString()
	refresh_token!: string;

	@IsString()
	scope!: string;

	@IsInt()
	created_at!: number;

	@IsInt()
	secret_valid_until!: number;
}
