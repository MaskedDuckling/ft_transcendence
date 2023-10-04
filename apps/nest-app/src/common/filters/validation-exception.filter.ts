import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { ValidationError } from "class-validator";
import { Response } from "express";

@Catch(ValidationError)
export class ValidationExceptionFilter implements ExceptionFilter {
	catch(exception: ValidationError, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();

		let errors: string[] = [];

		if (exception.children) {
			errors = exception.children.flatMap((error) =>
				error.constraints ? Object.values(error.constraints) : []
			);
		}
		const errorMessage = errors.join(", ");

		response
			.status(400)
			.json({ error: "Validation failed", message: errorMessage });
	}
}
