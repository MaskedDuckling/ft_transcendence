import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "../auth/controller/auth.controller";
import { AuthService } from "../auth/service/auth.service";
import { UserService } from "../app/service/user.service";
import * as fs from "fs";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Readable } from "stream";
import { User } from "../app/entities/user.entity";
import { Response } from "express";

describe("AuthController", () => {
	let controller: AuthController;
	let authService: AuthService;
	let userService: UserService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AuthController],
			providers: [
				{
					provide: AuthService,
					useValue: {
						getAccessToken: jest.fn(),
						getUserInfo: jest.fn(),
						getOrCreateUser: jest.fn(),
						usernameChecker: jest.fn(),
						createUser: jest.fn(),
						updateAvatar: jest.fn(),
					},
				},
				{
					provide: UserService,
					useValue: {
						isTwoFAEnabled: jest.fn(),
						getUserFromUsername: jest.fn(),
					},
				},
			],
		}).compile();

		controller = module.get<AuthController>(AuthController);
		authService = module.get<AuthService>(AuthService);
		userService = module.get<UserService>(UserService);
	});
	const getMockedFile: Express.Multer.File = {
		fieldname: "",
		originalname: "",
		encoding: "",
		mimetype: "",
		size: 0,
		destination: "",
		filename: "",
		path: "../../public/uploads/Baudrim.png",
		buffer: Buffer.alloc(0),
		stream: new Readable(),
	};
	getMockedFile.stream.push(null);

	describe("verification", () => {
		it("should return user info if user does not have 2FA enabled", async () => {
			const mockReq: any = { session: {} };
			const mockRes: any = {
				send: jest.fn(),
				setHeader: jest.fn(),
				json: jest.fn(),
			};
			const mockBody: any = { code: "test_code" };
			const mockTokenData: any = { access_token: "access_token" };
			const mockUserInfo: any = { username: "test_user" };
			const mockUser: any = { id: "test_id", username: "test_user" };

			jest.spyOn(authService, "getAccessToken").mockResolvedValue(
				mockTokenData
			);
			jest.spyOn(authService, "getUserInfo").mockResolvedValue(
				mockUserInfo
			);
			jest.spyOn(authService, "getOrCreateUser").mockResolvedValue(
				mockUser
			);
			jest.spyOn(userService, "isTwoFAEnabled").mockResolvedValue(false);

			await controller.verification(mockBody, mockReq, mockRes);

			// expect(mockRes.json).toHaveBeenCalledWith(mockUserInfo);
			expect(mockRes.send).toHaveBeenCalledWith(mockUserInfo);
		});

		it("should return user info with 2FA enabled if user has 2FA enabled", async () => {
			const mockReq: any = { session: {} };
			const mockRes: any = {
				send: jest.fn(),
				setHeader: jest.fn(),
				json: jest.fn(),
			};
			const mockBody: any = { code: "test_code" };
			const mockTokenData: any = { access_token: "access_token" };
			const mockUserInfo: any = { username: "test_user" };
			const mockUser: any = { id: "test_id", username: "test_user" };

			jest.spyOn(authService, "getAccessToken").mockResolvedValue(
				mockTokenData
			);
			jest.spyOn(authService, "getUserInfo").mockResolvedValue(
				mockUserInfo
			);
			jest.spyOn(authService, "getOrCreateUser").mockResolvedValue(
				mockUser
			);
			jest.spyOn(userService, "isTwoFAEnabled").mockResolvedValue(true);

			await controller.verification(mockBody, mockReq, mockRes);

			expect(mockRes.json).toHaveBeenCalledWith({
				...mockUserInfo,
				twoFAEnabled: true,
			});
		});
	});
	describe("usernameChecker", () => {
		it("should return error if username is not provided", async () => {
			const mockRes: any = { json: jest.fn() };
			const mockQuery: any = undefined;
			await controller.usernameChecker(mockQuery, mockRes);
			expect(mockRes.json).toHaveBeenCalledWith({
				error: "username not found in params",
			});
		});
		it("should return true if username is found", async () => {
			const mockRes: any = { json: jest.fn() };
			const mockQuery: any = "test_user";
			jest.spyOn(authService, "usernameChecker").mockResolvedValue(true);
			await controller.usernameChecker(mockQuery, mockRes);
			expect(mockRes.json).toHaveBeenCalledWith(true);
		});
		it("should return false if username is not found", async () => {
			const mockRes: any = { json: jest.fn() };
			const mockQuery: any = "test_user";
			jest.spyOn(authService, "usernameChecker").mockResolvedValue(false);
			await controller.usernameChecker(mockQuery, mockRes);
			expect(mockRes.json).toHaveBeenCalledWith(false);
		});
	});
	describe("createUser", () => {
		it("should throw error if username is not provided", async () => {
			const req: any = { user: { username: "test_user" } };
			const username = "";

			fs.promises.unlink = jest.fn(() => Promise.resolve());
			authService.registerUser = jest.fn();

			await expect(
				controller.createUser(getMockedFile, req, username)
			).rejects.toThrow(BadRequestException);
			expect(fs.promises.unlink).toHaveBeenCalledWith(getMockedFile.path);
		});

		it("should throw error if user is not defined or user already has username", async () => {
			const req: any = { user: undefined };
			const username = "test_user";

			fs.promises.unlink = jest.fn(() => Promise.resolve());
			authService.registerUser = jest.fn();

			await expect(
				controller.createUser(getMockedFile, req, username)
			).rejects.toThrow(BadRequestException);
			expect(fs.promises.unlink).toHaveBeenCalledWith(getMockedFile.path);
		});

		it("should throw error if username is already taken", async () => {
			const req: any = { user: { username: null } };
			const username = "test_user";
			const existingUser: Partial<User> = {
				id: 1,
				username: "existing_username",
				email: "existing_email",
				oauth_user_id: "existing_oauth_user_id",
			};

			fs.promises.unlink = jest.fn(() => Promise.resolve());
			authService.registerUser = jest.fn();
			userService.getUserFromUsername = jest.fn(() =>
				Promise.resolve(existingUser as User)
			);

			await expect(
				controller.createUser(getMockedFile, req, username)
			).rejects.toThrow(BadRequestException);
			expect(fs.promises.unlink).toHaveBeenCalledWith(getMockedFile.path);
		});

		it("should create user if all conditions are met", async () => {
			const req: any = {
				user: { username: null, oauth_user_id: "test_id" },
			};
			const username = "test_user";
			const mockUser: Partial<User> = {
				id: 1,
				username: "test_user",
				email: "test_email",
				oauth_user_id: "test_id",
			};

			fs.promises.unlink = jest.fn(() => Promise.resolve());
			authService.registerUser = jest.fn(() =>
				Promise.resolve(mockUser as User)
			);
			userService.getUserFromUsername = jest.fn(() =>
				Promise.resolve(null)
			);

			const result = await controller.createUser(
				getMockedFile,
				req,
				username
			);

			expect(result).toEqual(mockUser);
			expect(fs.promises.unlink).not.toHaveBeenCalled();
		});
		//TODO: test if file is not found or not valid
	});
	describe("avatarUpdate", () => {
		it("should throw an error if user is not defined or does not have a username", async () => {
			const req: any = { user: undefined };
			const res: any = {
				send: jest.fn(),
				setHeader: jest.fn(),
			};

			await controller.avatarUpdate(getMockedFile, req, res);
			expect(fs.promises.unlink).toHaveBeenCalledWith(getMockedFile.path);
			expect(res.send).toHaveBeenCalledWith(
				JSON.stringify({ error: "L'utilisateur n'est pas inscrit" })
			);
		});

		it("should throw an error if file is not found", async () => {
			const req: any = {
				user: {
					username: "test_user",
				},
			};
			const res: any = {
				send: jest.fn(),
				setHeader: jest.fn(),
			};

			await controller.avatarUpdate({} as any, req, res);
			expect(res.send).toHaveBeenCalledWith(
				JSON.stringify({ error: "file not found" })
			);
		});

		it("should update avatar if user and file are defined", async () => {
			const req: any = {
				user: {
					username: "test_user",
				},
			};
			const res: any = {
				send: jest.fn(),
				setHeader: jest.fn(),
			};
			const avataruser: Partial<User> = {
				id: 1,
				username: "test_user",
				email: "test_email",
				oauth_user_id: "test_id",
			};
			jest.spyOn(authService, "updateAvatar").mockResolvedValue(
				avataruser as User
			);

			await controller.avatarUpdate(getMockedFile, req, res);
			expect(res.send).toHaveBeenCalledWith(
				JSON.stringify({ avatar: avataruser })
			);
		});
	});
	describe("checkAuthentication", () => {
		it("should return authenticated false if user is not authenticated", async () => {
			const req = getMockedRequest();
			const res = getMockedResponse();

			await controller.checkAuthentication(req, res);
			expect(res.send).toHaveBeenCalledWith(
				JSON.stringify({ authenticated: false })
			);
		});

		it("should return authenticated true and user details if user is authenticated", async () => {
			const req = getMockedRequest();
			const res = getMockedResponse();
			const username = "test_user";
			const avatar = "test_avatar";

			// Set the userId in the session and add user details to req.user
			req.session.userId = { userId: 1 };
			req.user = { username, avatar };

			await controller.checkAuthentication(req, res);

			expect(res.send).toHaveBeenCalledWith(
				JSON.stringify({
					authenticated: true,
					username,
					avatar,
				})
			);
		});
	});
	describe("myInfos", () => {
		it("should throw an error if user is not defined", async () => {
			const req = { user: undefined } as any;
			const res = getMockedResponse();

			await expect(controller.myInfos(req, res)).rejects.toThrow(
				NotFoundException
			);
		});

		it("should send error if user is defined but username is undefined", async () => {
			const req = { user: {} } as any;
			const res = getMockedResponse();

			await controller.myInfos(req, res);

			expect(res.setHeader).toHaveBeenCalledWith(
				"Content-Type",
				"application/json"
			);
			expect(res.send).toHaveBeenCalledWith(
				JSON.stringify({ error: "L'utilisateur n'est pas inscrit" })
			);
		});

		it("should send user info if user is defined with username and avatar", async () => {
			const username = "test_username";
			const avatar = "test_avatar.png";
			const oauth_user_id = "test_oauth_id";

			const req = { user: { username, avatar, oauth_user_id } } as any;
			const res = getMockedResponse();

			await controller.myInfos(req, res);

			expect(res.setHeader).toHaveBeenCalledWith(
				"Content-Type",
				"application/json"
			);

			const expectedResponse = {
				username,
				avatar: process.env.NEST_URL + "/uploads/" + avatar,
				login: oauth_user_id,
			};

			expect(res.send).toHaveBeenCalledWith(
				JSON.stringify(expectedResponse)
			);
		});
	});

	describe("getavatar", () => {
		let req: any;
		let res: MockResponse;

		beforeEach(() => {
			req = getMockedRequest();
			res = getMockedResponse();
		});

		it("should send error if user does not exist", async () => {
			jest.spyOn(userService, "getUserFromUsername").mockResolvedValue(
				null
			);

			await controller.getavatar(req, res, "nonexistent_username");
			expect(res.status).toHaveBeenCalledWith(403);
		});
		it("should handle case where no username is provided in the request body", async () => {
			req.body = {};

			await controller.getavatar(req, res, undefined as any);
			expect(res.status).toHaveBeenCalledWith(400);
		});

		it("should send avatar and username if user exists and username is defined", async () => {
			const user: Partial<User> = {
				username: "existent_username",
				avatar: "user_avatar",
			};
			jest.spyOn(userService, "getUserFromUsername").mockResolvedValue(
				user as User
			);

			await controller.getavatar(req, res, "existent_username");
			expect(res.send).toHaveBeenCalledWith({
				avatar: process.env.NEST_URL + "/uploads/" + user.avatar,
				username: user.username,
			});
		});

		it("should send undefined avatar and username if user exists but avatar is not defined", async () => {
			const user: Partial<User> = {
				username: "existent_username",
				avatar: undefined,
			};
			jest.spyOn(userService, "getUserFromUsername").mockResolvedValue(
				user as User
			);

			await controller.getavatar(req, res, "existent_username");
			expect(res.send).toHaveBeenCalledWith({
				avatar: undefined,
				username: user.username,
			});
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
