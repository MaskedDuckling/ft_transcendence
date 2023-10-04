import { TwoFAController } from "../TwoFA/controller/TwoFA.controller";
import { TwoFAService } from "../TwoFA/service/TwoFA.service";
import { UserService } from "../app/service/user.service";
import { BadRequestException } from "@nestjs/common";
import { User } from "../app/entities/user.entity";
import { Any, Repository } from "typeorm";
import { Response } from "express";

describe("TwoFAController", () => {
	let controller: TwoFAController;
	let twoFAService: TwoFAService;
	let userService: UserService;
	let req: any;
	let res: any;
	let mockUserRepository: jest.Mocked<Repository<User>>;

	beforeEach(() => {
		mockUserRepository = {
			findOne: jest.fn(),
			save: jest.fn(),
		} as any;

		twoFAService = new TwoFAService();
		userService = new UserService(mockUserRepository);
		controller = new TwoFAController(twoFAService, userService);
		req = getMockedRequest();
		res = getMockedResponse();
	});

	describe("generate", () => {
		it("should throw a BadRequestException if no user or username is in the request", async () => {
			req.user = undefined;

			await expect(controller.generate(req, res)).rejects.toThrow(
				BadRequestException
			);
		});

		it("should generate a new 2FA secret code and update the user", async () => {
			const user: Partial<User> = {
				username: "existent_user",
			};
			const secretCode = {
				secret: "secret",
				qrCode: "qrCode",
			};
			req.user = user;

			jest.spyOn(twoFAService, "generateSecretCode").mockResolvedValue(
				secretCode
			);
			jest.spyOn(
				userService,
				"updateTwoFASecretByUser"
			).mockResolvedValue(undefined);

			await controller.generate(req, res);

			expect(twoFAService.generateSecretCode).toHaveBeenCalledWith(
				user.username
			);
			expect(userService.updateTwoFASecretByUser).toHaveBeenCalledWith(
				user,
				[secretCode.secret, false]
			);
			expect(res.send).toHaveBeenCalledWith({
				secretCode,
				isTwoFAEnabled: false,
			});
		});
	});
	describe("verify", () => {
		it("should set session and respond with isValid=true when auth code is valid and user exists", async () => {
			const username = "testuser";
			const authCode = "123456";
			const userId = 1;
			const user: Partial<User> = {
				id: userId,
				username,
			};

			jest.spyOn(userService, "verifyTwoFACode").mockResolvedValue(true);
			jest.spyOn(
				userService,
				"getUserFromNormalizedUsername"
			).mockResolvedValue(user as User);

			await controller.verify({ authCode, username }, res, req);

			expect(req.session.userId).toEqual({ userId });
			expect(req.session.twoFASuccess).toEqual(true);
			expect(res.send).toHaveBeenCalledWith({ isValid: true });
		});

		it("should throw BadRequestException when auth code is valid but user does not exist", async () => {
			const username = "testuser";
			const authCode = "123456";

			jest.spyOn(userService, "verifyTwoFACode").mockResolvedValue(true);
			jest.spyOn(
				userService,
				"getUserFromNormalizedUsername"
			).mockResolvedValue(undefined as any);

			await expect(
				controller.verify({ authCode, username }, res, req)
			).rejects.toThrow(BadRequestException);
		});

		it("should respond with isValid=false when auth code is invalid", async () => {
			const username = "testuser";
			const authCode = "123456";

			jest.spyOn(userService, "verifyTwoFACode").mockResolvedValue(false);

			await controller.verify({ authCode, username }, res, req);

			expect(res.send).toHaveBeenCalledWith({ isValid: false });
		});
		it("should throw BadRequestException when no username is provided", async () => {
			const authCode = "123456";
			await expect(
				controller.verify({ authCode } as any, res, req)
			).rejects.toThrow(BadRequestException);
		});
		it("should throw BadRequestException when no authCode is provided", async () => {
			const username = "testuser";
			await expect(
				controller.verify({ username } as any, res, req)
			).rejects.toThrow(BadRequestException);
		});
	});
	describe("verifyAfterCreation", () => {
		const user = { id: 1, username: "username" };
		const authCode = "123456";
		let req: any;
		let res: any;

		beforeEach(() => {
			req = getMockedRequest();
			res = getMockedResponse();
			req.user = user;
		});

		it("should throw BadRequestException if no user is attached to request", async () => {
			req.user = undefined;

			await expect(
				controller.verifyAfterCreation({ authCode }, res, req)
			).rejects.toThrow(BadRequestException);
		});

		it("should throw BadRequestException if user attached to request has no username", async () => {
			req.user.username = undefined;

			await expect(
				controller.verifyAfterCreation({ authCode }, res, req)
			).rejects.toThrow(BadRequestException);
		});

		it("should send isValid as true and set session variable if the verification is successful", async () => {
			const user: Partial<User> = {
				username: "existent_user",
			};
			req.user = user;
			jest.spyOn(userService, "verifyTwoFACode").mockResolvedValue(true);
			jest.spyOn(
				userService,
				"updateTwoFASecretBoolByUser"
			).mockResolvedValue();

			await controller.verifyAfterCreation({ authCode }, res, req);

			expect(res.send).toHaveBeenCalledWith({ isValid: true });
			expect(req.session["twoFASuccess"]).toBe(true);
		});

		it("should send isValid as false if the verification is unsuccessful", async () => {
			const user: Partial<User> = {
				username: "existent_user",
			};
			req.user = user;
			jest.spyOn(userService, "verifyTwoFACode").mockResolvedValue(false);

			await controller.verifyAfterCreation({ authCode }, res, req);

			expect(res.send).toHaveBeenCalledWith({ isValid: false });
			expect(req.session["twoFASuccess"]).toBeUndefined();
		});
		it("should throw BadRequestException if no authCode is provided", async () => {
			const user: Partial<User> = {
				username: "existent_user",
			};
			req.user = user;
			await expect(
				controller.verifyAfterCreation({} as any, res, req)
			).rejects.toThrow(BadRequestException);
		});
	});
	describe("checkTwoFAStatus", () => {
		const user = { id: 1, username: "username" };
		let req: any;
		let res: any;

		beforeEach(() => {
			req = getMockedRequest();
			res = getMockedResponse();
			req.user = user;
		});

		it("should throw BadRequestException if no user is attached to request", async () => {
			req.user = undefined;

			await expect(controller.checkTwoFAStatus(req, res)).rejects.toThrow(
				BadRequestException
			);
		});

		it("should throw BadRequestException if user attached to request has no username", async () => {
			const user: Partial<User> = {};
			req.user = user;
			req.user.username = undefined;

			await expect(controller.checkTwoFAStatus(req, res)).rejects.toThrow(
				BadRequestException
			);
		});

		it("should send back the TwoFA status if user exists", async () => {
			const user: Partial<User> = {
				username: "existent_user",
			};
			req.user = user;
			const isTwoFAEnabled = true;
			jest.spyOn(userService, "isTwoFAEnabled").mockResolvedValue(
				isTwoFAEnabled
			);

			await controller.checkTwoFAStatus(req, res);

			expect(res.send).toHaveBeenCalledWith(isTwoFAEnabled);
		});
	});

	describe("disableTwoFA", () => {
		const user = { id: 1, username: "username" };
		let req: any;
		let res: any;

		beforeEach(() => {
			req = getMockedRequest();
			res = getMockedResponse();
			req.user = user;
		});

		it("should throw BadRequestException if no user is attached to request", async () => {
			req.user = undefined;

			await expect(controller.disableTwoFA(req, res)).rejects.toThrow(
				BadRequestException
			);
		});

		it("should throw BadRequestException if user attached to request has no username", async () => {
			const user: Partial<User> = {};
			req.user = user;
			req.user.username = undefined;

			await expect(controller.disableTwoFA(req, res)).rejects.toThrow(
				BadRequestException
			);
		});

		it("should remove TwoFA and send back false if user exists", async () => {
			const user: Partial<User> = {
				username: "existent_user",
			};
			req.user = user;
			jest.spyOn(userService, "removeTwoFAByUser").mockResolvedValue();

			await controller.disableTwoFA(req, res);

			expect(res.send).toHaveBeenCalledWith(false);
		});
	});
});

interface MockResponse extends Response {
	setHeader: jest.Mock;
	send: jest.Mock;
	status: jest.Mock;
}
function getMockedRequest() {
	return {
		session: {},
		user: null,
	} as any;
}

function getMockedResponse(): MockResponse {
	const res: Partial<MockResponse> = {
		setHeader: jest.fn().mockReturnThis(),
		send: jest.fn().mockReturnThis(),
		status: jest.fn().mockReturnThis(),
	};
	return res as MockResponse;
}
