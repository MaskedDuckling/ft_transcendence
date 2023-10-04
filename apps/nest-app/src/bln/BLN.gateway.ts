import {
	ConnectedSocket,
	MessageBody,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from "@nestjs/websockets";
import * as bcrypt from "bcrypt";
import { EntityManager } from "typeorm";
import { NotFoundException, OnModuleInit } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { UserService } from "../app/service/user.service";
import { sessionMiddleware } from "../app/sessionMiddleware";
import { ChannelService } from "../app/service/channel.service";
import { ChannelUserService } from "../app/service/channelUser.service";
import { FriendshipService } from "../app/service/friendship.service";
import { FriendshipStatus } from "../app/entities/friendship.entity";
import { User, UserStatus } from "../app/entities/user.entity";
import { UserRole } from "../app/entities/channelUser.entity";
import { Friendship } from "../app/entities/friendship.entity";
import { ChannelType } from "../app/entities/channel.entity";
import { PongGateway } from "../pong/pong.gateway";

@WebSocketGateway({
	cors: {
		origin: process.env.REACT_URL,
		methods: ["GET", "POST"],
		credentials: true,
	},
})
export class BLNGateway implements OnModuleInit {
	constructor(
		private UserService: UserService,
		private channelService: ChannelService,
		private channelUserService: ChannelUserService,
		private FriendshipService: FriendshipService,
		private manager: EntityManager,
		private pongGateway: PongGateway
	) {}

	@WebSocketServer()
	server!: Server;

	private userSessions: Record<string, string> = {}; // Contient les noms d'utilisateur associés à chaque socket ID
	private activeChannel: Record<string, string> = {};
	private userChannels: Record<string, string[]> = {};
	private pendingGameInvitations: { [key: string]: { requester: { userId: any; username: string; }, target: string } } = {};
	private mutedUsers: Record<
		number,
		Record<
			number,
			{ timeout: NodeJS.Timeout; startedAt: number; duration: number }
		>
	> = {};

	private static SESSION_RELOAD_INTERVAL = 45 * 60 * 1000; // 45min
	private pingTimestamps: Record<string, number> = {};

	onModuleInit() {
		const io = this.server; // Récupère le serveur io sous-jacent
		io.engine.use(sessionMiddleware);

		io.on("connection", (socket) => {

			  const pingTimer = setInterval(() => {
				socket.emit("ping");
				this.pingTimestamps[socket.id] = Date.now();
			  }, 1000);
			const timer = setInterval(() => {
				(socket.request as any).session.reload((err: Error | null) => {
					if (err) {
						socket.emit("sessionExpired");
						socket.conn.close();
					}
				});
			}, BLNGateway.SESSION_RELOAD_INTERVAL);
			socket.on("disconnect", () => {
				const disconnectingUserId = (socket.request as any).session.userId?.userId;
				console.log(`Disconnecting user ID: ${disconnectingUserId}`);
				console.log(`User Sessions: ${JSON.stringify(this.userSessions)}`);
				clearInterval(timer);

				if (disconnectingUserId) {
					const disconnectingUsername = this.userSessions[socket.id];
					console.log(`Disconnecting username: ${disconnectingUsername}`);

					const inviterIds = Object.keys(this.pendingGameInvitations).filter(
					(inviterId) => this.pendingGameInvitations[inviterId].target === disconnectingUsername
					);
					console.log(`Inviter IDs: ${JSON.stringify(inviterIds)}`);

					for (const inviterId of inviterIds) {
					const inviterSocketId = Object.keys(this.userSessions).find(
						(key) => this.userSessions[key] === this.pendingGameInvitations[inviterId].requester.username

					);
					console.log(`Inviter Socket ID: ${inviterSocketId}`);

					if (inviterSocketId) {
						this.server.to(inviterSocketId).emit("gameInviteCanceled");
					}
					delete this.pendingGameInvitations[inviterId];
					}
				}
				if (
					disconnectingUserId &&
					this.pendingGameInvitations[disconnectingUserId]
				) {
					const username = this.userSessions[socket.id];

					const targetSocketId = Object.keys(this.userSessions).find(
						(key) => this.userSessions[key] === this.pendingGameInvitations[disconnectingUserId].target

					);
					if (targetSocketId) {
						this.server
							.to(targetSocketId)
							.emit("gameInviteCanceled", {
								username: username,
							});
					}
					delete this.pendingGameInvitations[disconnectingUserId];
				}
				delete this.userChannels[socket.id];
				delete this.activeChannel[socket.id];
				delete this.userSessions[socket.id];
				// Arrêter l'intervalle de renouvellement de la session pour ce socket
				clearInterval(timer);
				clearInterval(pingTimer);
			});
		});
	}

	handleDisconnect(client: Socket): void {
		//console.log("Client disconnected in bln:", client.id);
	}

	private getSocketFromUsername(username: string): Socket | null {
		for (const [socketId, storedUsername] of Object.entries(
			this.userSessions
		)) {
			if (storedUsername === username) {
				return this.server.sockets.sockets.get(socketId) || null;
			}
		}
		return null;
	}

	private notifyUsersInChannel(
		socket: Socket,
		channelId: string,
		username: string,
		role: UserRole | undefined
	): void {
		for (const [connectedSocketId, connectedChannels] of Object.entries(
			this.userChannels
		)) {
			if (
				connectedChannels.includes(channelId) &&
				this.activeChannel[connectedSocketId] === channelId
			) {
				const connectedSocket =
					this.server.sockets.sockets.get(connectedSocketId);
				connectedSocket?.emit("userJoinedChannel", {
					username,
					role,
				});
			}
		}
	}
	private sendServerMessage(channelId: string, message: string) {
		this.server.in(channelId).emit(`message-${channelId}`, {
			user: "SERVER",
			message: message,
		});
	}
	private msToHumanReadable(ms: number): string {
		const days = Math.floor(ms / (24 * 60 * 60 * 1000));
		const daysMs = ms % (24 * 60 * 60 * 1000);
		const hours = Math.floor(daysMs / (60 * 60 * 1000));
		const hoursMs = ms % (60 * 60 * 1000);
		const minutes = Math.floor(hoursMs / (60 * 1000));
		const minutesMs = ms % (60 * 1000);
		const seconds = Math.floor(minutesMs / 1000);

		return `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
	}
	private async isUserBannedFromChannel(
		userId: number,
		channelId: number
	): Promise<boolean> {
		return await this.channelUserService.isUserBannedFromChannel(
			userId,
			channelId
		);
	}

	private async checkChannelName(
		channelName: string
	): Promise<Boolean | string> {
		// Vérifier si le nom du canal est déjà pris (insensible à la casse)
		const channel = await this.channelService.getChannelbyNormalizedName(
			channelName
		);
		if (channel !== null) {
			return "Channel name is already taken.";
		}

		// Vérifier si le nom du canal contient le caractère "@"
		if (channelName.includes("@")) {
			return "Channel name cannot contain '@'.";
		}

		// Vérifier la longueur du nom du canal (par exemple, au moins 3 caractères, pas plus de 20)
		if (channelName.length < 3 || channelName.length > 20) {
			return "Channel name must be between 3 and 20 characters.";
		}

		// Vérifier si le nom du canal contient uniquement des caractères alphanumériques et des tirets
		const regex = /^[a-zA-Z0-9-]+$/;
		if (!regex.test(channelName)) {
			return "Channel name can only contain alphanumeric characters and hyphens.";
		}

		return true;
	}

	private async acceptFriendRequest(
		requesterId: number,
		targetUser: User,
		existingRequest: Friendship,
		socket: Socket
	) {
		try {
			await this.FriendshipService.updateFriendshipStatus(
				existingRequest,
				FriendshipStatus.ACCEPTED
			);

			// Créer la relation d'amitié inverse
			const reverseTargetUser = await this.UserService.getUserById(
				requesterId
			);
			const reverseFriendship =
				await this.FriendshipService.createFriendship(
					reverseTargetUser,
					targetUser
				);

			await this.FriendshipService.updateFriendshipStatus(
				reverseFriendship,
				FriendshipStatus.ACCEPTED
			);

			socket.emit(
				"friendRequestAccepted",
				targetUser.username,
				targetUser.status as string
			);

			const friendSocketId = Object.keys(this.userSessions).find(
				(key) =>
					this.userSessions[key] === targetUser.username.toString()
			);

			if (friendSocketId) {
				const acceptingUser = await this.UserService.getUserById(
					requesterId
				);

				this.server
					.to(friendSocketId)
					.emit(
						"friendRequestAcceptedNotification",
						this.userSessions[socket.id],
						acceptingUser.status
					);
			}
		} catch (error) {
			console.error("Error while accepting friend request:", error);
		}
	}

	private mapStringToChannelType(typeStr: string): ChannelType {
		switch (typeStr) {
			case "public":
				return ChannelType.PUBLIC;
			case "private":
				return ChannelType.PRIVATE;
			case "password_protected":
				return ChannelType.PASSWORD_PROTECTED;
			default:
				throw new Error("Invalid channel type provided.");
		}
	}
@SubscribeMessage("Pong")
	async handlePong(@ConnectedSocket() socket: Socket) {
		const latency = Date.now() - this.pingTimestamps[socket.id];
		if (latency > 142) {
			socket.emit("highLatency", { latency });
		}
	}
	@SubscribeMessage("InitBLN")
	async handleInitBLN(@ConnectedSocket() socket: Socket) {
		const userid = (socket.request as any).session.userId;
		if (userid) {
			this.UserService.getUserById(userid.userId)
				.then(async (user) => {
				//	console.log("Inside InitBLN, quote retrieved:", user.quote);
					socket.emit("quoteRetrieved", user.quote);
					this.userSessions[socket.id] = user.username;
					return await this.channelUserService.getUserChannels(
						userid.userId
					);
				})
				.then(async (channels) => {
					// Rejoindre chaque canal trouvé
					const joinedChannels: { id: number; name: string }[] = [];
					await Promise.all(
						channels.map(async (channel) => {
							// console.log("Channel:", channel.name);

							// Vérifier si l'utilisateur est banni de ce canal
							const isBanned = await this.isUserBannedFromChannel(
								userid.userId,
								channel.id
							);
							if (isBanned) {
								// console.log(
								// 	`User is banned from channel: ${channel.name}`
								// );
								return;
							}

							// Rejoindre le canal
							socket.join(channel.id.toString());
							this.userChannels[socket.id] =
								this.userChannels[socket.id] || [];
							// console.log(
							// 	"this.userChannels[socket.id]:",
							// 	this.userChannels[socket.id]
							// );
							if (
								!this.userChannels[socket.id].includes(
									channel.id.toString()
								)
							) {
								this.userChannels[socket.id].push(
									channel.id.toString()
								);
								joinedChannels.push({
									id: channel.id,
									name: channel.name,
								}); // stocker les informations du canal
							} else {
								joinedChannels.push({
									id: channel.id,
									name: channel.name,
								});
							}
						})
					);

					// console.log("Channels retrieved:", joinedChannels);
					socket.emit("channelsRetrieved", joinedChannels);
					const friends =
						await this.FriendshipService.getFriendshipsForUser(
							userid.userId
						);
					// console.log("friendships retrieved:", friends);
					socket.emit("friendshipsRetrieved", friends);
					if (joinedChannels.length === 0) {
						this.handleJoinChannelByName(
							{
								channelName: "General",
								channelPassword: "",
							},
							socket
						);
					}
				})
				.catch((error) => {
					console.error("Error fetching user:", error);
				});
		}
	}
	@SubscribeMessage("InitApp")
	async handleInitApp(@ConnectedSocket() socket: Socket) {
		const userid = (socket.request as any).session.userId;
		if (userid) {
			this.UserService.getUserById(userid.userId)
				.then(async (user) => {
					// console.log("Inside InitBLN, quote retrieved:", user.quote);
					socket.emit("quoteRetrieved", user.quote);
					this.userSessions[socket.id] = user.username;
					return await this.channelUserService.getUserChannels(
						userid.userId
					);
				})
				.then(async (channels) => {
					// Rejoindre chaque canal trouvé
					const joinedChannels: { id: number; name: string }[] = [];
					await Promise.all(
						channels.map(async (channel) => {
							// console.log("Channel:", channel.name);
							const isBanned = await this.isUserBannedFromChannel(
								userid.userId,
								channel.id
							);
							if (isBanned) {
								// console.log(
								// 	`User is banned from channel: ${channel.name}`
								// );
								return;
							}
							socket.join(channel.id.toString());
							this.userChannels[socket.id] =
								this.userChannels[socket.id] || [];
							// console.log(
							// 	"this.userChannels[socket.id]:",
							// 	this.userChannels[socket.id]
							// );
							if (
								!this.userChannels[socket.id].includes(
									channel.id.toString()
								)
							) {
								this.userChannels[socket.id].push(
									channel.id.toString()
								);
								joinedChannels.push({
									id: channel.id,
									name: channel.name,
								});
							} else {
								joinedChannels.push({
									id: channel.id,
									name: channel.name,
								});
							}
						})
					);
					// console.log("Channels retrieved:", joinedChannels);
					socket.emit("channelsRetrieved", joinedChannels);
					const friends =
						await this.FriendshipService.getFriendshipsForUser(
							userid.userId
						);
					// console.log("friendships retrieved:", friends);
					socket.emit("friendshipsRetrieved", friends);
				})
				.catch((error) => {
					console.error("Error fetching user:", error);
				});
		}
	}

	@SubscribeMessage("sendMessage")
	async handleSendMessage(
		@MessageBody() data: { message: string },
		@ConnectedSocket() client: Socket
	) {
		if (data.message.trim() === "") return;
		const activeChannelId = this.activeChannel[client.id];
		const activeChannelIdNumber = Number(activeChannelId);
		const userid = (client.request as any).session.userId;

		if (!userid) {
			client.emit("error", "Unauthorized request");
			return;
		}
		const userIdNumber = Number(userid.userId);
		// console.log(
		// 	"activeChannelIdNumber:",
		// 	activeChannelIdNumber,
		// 	"userIdNumber",
		// 	userIdNumber,
		// 	"mutedUsers:",
		// 	this.mutedUsers
		// );
		if (activeChannelId) {
			if (
				this.mutedUsers[activeChannelIdNumber] &&
				this.mutedUsers[activeChannelIdNumber][userIdNumber]
			) {
				const muteInfo =
					this.mutedUsers[activeChannelIdNumber][userIdNumber];
				const timeElapsed = Date.now() - muteInfo.startedAt;
				const timeRemaining = muteInfo.duration - timeElapsed;
				const humanReadableTimeRemaining =
					this.msToHumanReadable(timeRemaining);

				client.emit(`message-${activeChannelId}`, {
					user: "SERVER",
					message: "You are muted for " + humanReadableTimeRemaining,
				});

				return;
			}
			// console.log(
			// 	"Inside sendMessage server-side, gonna send the message: '",
			// 	data.message,
			// 	"' On channel ",
			// 	activeChannelId,
			// 	"with emit:",
			// 	activeChannelId
			// );
			if (activeChannelId[0] === "@") {
				const friendSocket = this.getSocketFromUsername(
					activeChannelId.slice(1)
				);
				if (!friendSocket) {
					return;
					//TODO: proteger
				}
				client.emit("PrivateMessage", {
					user: this.userSessions[client.id],
					message: data.message,
					channelName: activeChannelId,
				});
				friendSocket.emit("PrivateMessage", {
					user: this.userSessions[client.id],
					message: data.message,
					channelName: "@" + this.userSessions[client.id],
				});
			} else {
				this.server
					.in(activeChannelId)
					.emit(`message-${activeChannelId}`, {
						user: this.userSessions[client.id],
						message: data.message,
					});
			}
		}
	}

	@SubscribeMessage("promoteAdmin")
	async handlePromoteAdmin(
		@MessageBody() usernameToPromote: string,
		@ConnectedSocket() socket: Socket
	): Promise<void> {
		try {
			const currentUserId = (socket.request as any).session.userId;

			if (!currentUserId) {
				socket.emit("adminPromoted", {
					success: false,
					message: "Unauthorized request",
				});
				return;
			}

			const userToPromote = await this.UserService.getUserFromUsername(
				usernameToPromote
			);

			if (!userToPromote) {
				throw new NotFoundException("User was not found.");
			}

			const channelId = Number(this.activeChannel[socket.id]);
			if (isNaN(channelId)) {
				throw new Error("Channel ID is not a number(NaN).");
			}
			// Tentative de promotion de l'utilisateur
			await this.channelUserService.promoteToAdmin(
				channelId,
				currentUserId.userId,
				userToPromote.id
			);

			socket.emit("UpdateRole", {
				username: usernameToPromote,
				role: UserRole.ADMIN,
			});
			this.notifyUsersInChannel(
				socket,
				this.activeChannel[socket.id],
				usernameToPromote,
				UserRole.ADMIN
			);
			this.sendServerMessage(
				this.activeChannel[socket.id],
				`${usernameToPromote} has been promoted to admin.`
			);
		} catch (error) {
			socket.emit("error", {
				message:
					(error as Error).message || "Error while promoting user.",
			});
		}
	}

	@SubscribeMessage("demoteAdmin")
	async handleDemoteAdmin(
		@MessageBody() usernameToDemote: string,
		@ConnectedSocket() socket: Socket
	): Promise<void> {
		try {
			const currentUserId = (socket.request as any).session.userId;

			if (!currentUserId) {
				socket.emit("adminPromoted", {
					success: false,
					message: "Unauthorized request",
				});
				return;
			}

			const userToDemote = await this.UserService.getUserFromUsername(
				usernameToDemote
			);

			if (!userToDemote) {
				throw new NotFoundException("User was not found.");
			}

			const channelId = Number(this.activeChannel[socket.id]);
			if (isNaN(channelId)) {
				throw new Error("Channel ID is not a number(NaN).");
			}
			await this.channelUserService.demoteFromAdmin(
				channelId,
				currentUserId.userId,
				userToDemote.id
			);

			socket.emit("UpdateRole", {
				username: usernameToDemote,
				role: UserRole.MEMBER,
			});
			this.notifyUsersInChannel(
				socket,
				this.activeChannel[socket.id],
				usernameToDemote,
				UserRole.MEMBER
			);
			this.sendServerMessage(
				this.activeChannel[socket.id],
				`${usernameToDemote} is no longer an admin.`
			);
		} catch (error) {
			socket.emit("error", {
				message:
					(error as Error).message || "Error while promoting user.",
			});
		}
	}

	@SubscribeMessage("joinChannelByName")
	async handleJoinChannelByName(
		@MessageBody() data: { channelName: string; channelPassword: string },
		@ConnectedSocket() socket: Socket
	) {
		// console.log("Trying to join channel to:", data.channelName);
		// console.log("socket id = ", socket.id);
		const userId = parseInt(
			(socket.request as any).session.userId.userId,
			10
		);
		try {
			const channel = await this.channelService.getChannelbyName(
				data.channelName
			);
			if (
				await this.channelUserService.isUserBannedFromChannel(
					userId,
					channel.id
				)
			) {
				socket.emit("error", "You are banned from this channel.");
				return;
			}
			if (channel.type === ChannelType.PRIVATE) {
				// socket.emit(
				// 	"channelAccessError",
				// 	"Cannot join a private channel."
				// );
				// return;
				const isFriendWithOwner =
					await this.FriendshipService.getFriendship(
						Number(userId),
						channel.ownerId
					);

				if (
					(!isFriendWithOwner && userId !== channel.ownerId) ||
					(isFriendWithOwner &&
						isFriendWithOwner.status !== FriendshipStatus.ACCEPTED)
				) {
					socket.emit(
						"channelAccessError",
						"Cannot join a private channel."
					);
					return;
				}
			}
			if (
				this.userChannels[socket.id] &&
				this.userChannels[socket.id].includes(channel.id.toString())
			) {
				this.activeChannel[socket.id] = channel.id.toString();
				// console.log(
				// 	"SUCCESS: server-side you switched to ",
				// 	channel.name
				// );
				socket.emit(
					"switchedChannel",
					channel.name,
					channel.id,
					channel.type
				);
				return;
			}
			if (socket.rooms.hasOwnProperty(channel.id.toString())) {
				socket.emit(
					"channelAccessError",
					"Vous avez déjà rejoint ce canal."
				);
				return;
			}
			if (channel.type === ChannelType.PASSWORD_PROTECTED) {
				const isPasswordCorrect = await bcrypt.compare(
					data.channelPassword,
					channel.password!
				);
				if (!data.channelPassword) {
					socket.emit("passwordRequired", "A password is required.");
					return;
				}
				if (!isPasswordCorrect) {
					socket.emit("channelAccessError", "Incorrect password.");
				} else {
					socket.join(channel.id.toString());
					this.userChannels[socket.id] =
						this.userChannels[socket.id] || [];
					if (
						!this.userChannels[socket.id].includes(
							channel.id.toString()
						)
					) {
						this.userChannels[socket.id].push(
							channel.id.toString()
						);
					}
					// console.log(
					// 	"SUCCESS: server-side you joined ",
					// 	channel.name
					// );
					await this.channelUserService.joinChannel(
						userId,
						channel.id,
						UserRole.MEMBER
					);
					socket.emit("joinedChannel", channel.name, channel.id);
				}
			} else {
				socket.join(channel.id.toString());
				this.userChannels[socket.id] =
					this.userChannels[socket.id] || [];
				if (
					!this.userChannels[socket.id].includes(
						channel.id.toString()
					)
				) {
					this.userChannels[socket.id].push(channel.id.toString());
				}
				// console.log("SUCCESS: server-side you joined", channel.name);
				await this.channelUserService.joinChannel(
					userId,
					channel.id,
					UserRole.MEMBER
				);
				socket.emit("joinedChannel", channel.name, channel.id);
			}
			this.activeChannel[socket.id] = channel.id.toString();
		} catch (error) {
			socket.emit("channelNotFound");
		}
	}

	async switchToPrivate(username: string, socket: Socket) {
		const currentUserId = (socket.request as any).session.userId;
		if (currentUserId) {
			const friend = await this.UserService.getUserFromUsername(
				username.slice(1)
			);
			if (!friend) {
				throw new NotFoundException(
					"Error while trying to switch to private group with" +
						username.slice(1)
				);
			}
			const friendship = await this.FriendshipService.getFriendship(
				Number(currentUserId.userId),
				friend.id
			);
			if (!friendship) {
				throw new NotFoundException("Couldn't find the friendship.");
			}
			if (friendship.status !== FriendshipStatus.ACCEPTED) {
				throw new Error("You are not friends.");
			}
			const channelName = username;
			this.activeChannel[socket.id] = channelName;
			socket.emit("switchedToPrivate", {
				channelName,
				friendName: username.slice(1),
				friendAvatar: friend.avatar,
				friendQuote: friend.quote,
			});
		}
	}

	@SubscribeMessage("switchChannelByName")
	async switchChannel(
		@MessageBody() data: { channelName: string },
		@ConnectedSocket() socket: Socket
	) {
		try {
			if (data.channelName.charAt(0) === "@") {
				await this.switchToPrivate(data.channelName, socket);
				return;
			}
			const channel = await this.channelService.getChannelbyName(
				data.channelName
			);
			if (
				this.userChannels[socket.id] &&
				this.userChannels[socket.id].includes(channel.id.toString())
			) {
				// console.log("Successfuly switched channel to:", channel.name);
				const channelUsers =
					await this.channelUserService.getUsersByChannel(channel.id);

				const usersWithRoles = channelUsers.map((cu) => ({
					username: cu.user.username,
					role: cu.role,
				}));

				this.activeChannel[socket.id] = channel.id.toString();

				socket.emit(
					"switchedChannel",
					channel.name,
					channel.id,
					usersWithRoles,
					channel.type
				);

				const newUserRole = usersWithRoles.find(
					(u) => u.username === this.userSessions[socket.id]
				)?.role;
				this.notifyUsersInChannel(
					socket,
					channel.id.toString(),
					this.userSessions[socket.id],
					newUserRole
				);

				return;
			}
		} catch (error) {
			socket.emit("channelNotFound");
			console.error(error);
		}
	}

	@SubscribeMessage("sendGameInvitation")
	async handleSendGameInvitation(
		@MessageBody() target: { username: string },
		@ConnectedSocket() socket: Socket
	) {
		const requesterCheck = (socket.request as any).session.userId;
		if (requesterCheck) {
			if (this.pendingGameInvitations[requesterCheck]) {
				socket.emit("error", "You already have a pending invitation.");
				return;
			}
			const requesterId = requesterCheck.userId;
			let requesterUser: User;
			let targetUser: User | null;
			try {
				// Obtenir l'utilisateur cible à partir du nom d'utilisateur
				targetUser = await this.UserService.getUserFromUsername(
					target.username
				);

				if (!targetUser) {
					socket.emit("pongGameRequestError", "User not found.");
					return;
				}
				// Vérifier que l'utilisateur cible n'est pas offline

				if (targetUser.status === UserStatus.OFFLINE) {
					socket.emit(
						"pongGameRequestError",
						"User is currently offline."
					);
					return;
				}

				// Obtenir les informations du demandeur
				requesterUser = await this.UserService.getUserById(Number(requesterId));
				//verifier que le joueur n'est pas en game ou en queue
				if (
					requesterUser.status === UserStatus.INGAME ||
					requesterUser.status === UserStatus.INQUEUE || requesterUser.status === UserStatus.INTRAINING
				) {
					socket.emit(
						"pongGameRequestError",
						"You are currently in a game or in a queue."
					);
					return;
				}

				// A partir de ce point, nous supposons que les deux utilisateurs peuvent démarrer une partie
				// Informer l'utilisateur cible de la nouvelle demande de partie
				const targetSocketId = Object.keys(this.userSessions).find(
					(key) => this.userSessions[key] === target.username
				);

				if (targetSocketId) {
					// console.log(
					// 	"Emit pongGameRequestReceived to:",
					// 	targetSocketId
					// );
					this.server
						.to(targetSocketId)
						.emit("gameInviteReceived", requesterUser.username);
				}

				// Informer l'utilisateur demandeur que la demande de partie a été envoyée
				socket.emit("gameInviteSent", target.username);
				// this.pendingGameInvitations[requesterId] = target.username;
				this.pendingGameInvitations[requesterId] = { requester: { userId: requesterId, username: requesterUser.username }, target: target.username };

			} catch (error) {
				console.error("Error sending pong game request:", error);
				socket.emit(
					"pongGameRequestError",
					"An error occurred while sending the pong game request."
				);
			}
		}
	}

	@SubscribeMessage("cancelCurrentGameInvitation")
	async handleCancelCurrentGameInvitation(@ConnectedSocket() socket: Socket) {
		const requesterId = (socket.request as any).session.userId.userId;
		if (!requesterId) {
			socket.emit("error", "Unauthorized request.");
			return;
		}
		const user = await this.UserService.getUserById(Number(requesterId));
		// console.log(
		// 	"requesterId:",
		// 	requesterId,
		// 	"pendingInvitations:",
		// 	this.pendingGameInvitations
		// );
		if (!this.pendingGameInvitations[requesterId]) {
			socket.emit("error", "No pending invitation to cancel.");
			return;
		}
		const targetSocketId = Object.keys(this.userSessions).find(
			(key) => this.userSessions[key] === this.pendingGameInvitations[requesterId].target

		);
		delete this.pendingGameInvitations[requesterId];
		socket.emit("gameInviteCanceled");
		if (targetSocketId) {
			this.server
				.to(targetSocketId)
				.emit("gameInviteCanceled", { username: user.username });
		}
	}

	@SubscribeMessage("acceptGameInvitation")
	async handleAcceptGameInvitation(
		@MessageBody() data: { username: string },
		@ConnectedSocket() socket: Socket
	): Promise<void> {
		const requesterId = (socket.request as any).session.userId.userId;

		// Obtenir les informations de l'utilisateur qui accepte l'invitation
		const acceptingUser = await this.UserService.getUserById(requesterId);

		// Obtenir les informations de l'utilisateur qui a envoyé l'invitation
		const invitingUser = await this.UserService.getUserFromUsername(
			data.username
		);

		// Vérification des erreurs possibles avant de poursuivre
		if (!invitingUser) {
			socket.emit("pongGameRequestError", "Inviting user not found.");
			return;
		}

		// Vérification des statuts
		if (
			acceptingUser.status === UserStatus.INGAME ||
			acceptingUser.status === UserStatus.INQUEUE ||
			acceptingUser.status === UserStatus.INTRAINING||
			invitingUser.status === UserStatus.INGAME ||
			invitingUser.status === UserStatus.INQUEUE||
			invitingUser.status === UserStatus.INTRAINING
		) {
			socket.emit(
				"pongGameRequestError",
				"Either you or the friend are in a game or in a queue. Cannot accept the invitation."
			);
			return;
		}
		const friendSocket = this.getSocketFromUsername(data.username);
		if (!friendSocket) {
			socket.emit("pongGameRequestError", "Friend invite not found.");
			return;
		}
		//check if the invite is still valid
		if (!this.pendingGameInvitations[invitingUser.id]) {
			socket.emit("pongGameRequestError", "Friend invite not found.");
			return;
		}
		this.pongGateway.handleAcceptInvite({ friend: friendSocket }, socket);
		socket.emit("gameInviteAccepted", data.username);
		delete this.pendingGameInvitations[invitingUser.id];
	}

	@SubscribeMessage("declineGameInvitation")
	async handleDeclineGameInvitation(
		@MessageBody() data: { username: string },
		@ConnectedSocket() socket: Socket
	): Promise<void> {
		const requesterId = (socket.request as any).session.userId.userId;
		if (!requesterId) {
			socket.emit("error", "Unauthorized request.");
			return;
		}

		// Obtenir les informations de l'utilisateur qui a refusé l'invitation
		const decliningUser = await this.UserService.getUserById(requesterId);

		// Obtenir les informations de l'utilisateur qui a envoyé l'invitation
		const invitingUser = await this.UserService.getUserFromUsername(
			data.username
		);

		if (!invitingUser) {
			socket.emit("error", "Inviting user not found.");
			return;
		}

		// Supprimer l'invitation en attente
		if (this.pendingGameInvitations[requesterId]) {
			delete this.pendingGameInvitations[requesterId];
		}

		// Informer l'utilisateur qui a envoyé l'invitation que celle-ci a été refusée
		const friendSocketId = Object.keys(this.userSessions).find(
			(key) => this.userSessions[key] === invitingUser.username
		);

		if (friendSocketId) {
			this.server.to(friendSocketId).emit("gameInviteCanceled");
		}

		// Informer l'utilisateur qui a refusé l'invitation que celle-ci a été bien annulée
		socket.emit("gameInviteCanceled", {
			username: invitingUser.username,
		});
	}

	@SubscribeMessage("sendFriendRequest")
	async handleSendingFriendRequest(
		@MessageBody() target: { username: string },
		@ConnectedSocket() socket: Socket
	) {
		const requesterId = (socket.request as any).session.userId.userId;
		let requesterUser: User;
		let targetUserId: number;
		let shouldExit = false;
		try {
			await this.manager.transaction(
				async (transactionalEntityManager) => {
					// Obtenir l'utilisateur cible à partir du nom d'utilisateur
					const targetUser =
						await this.UserService.getUserFromUsername(
							target.username
						);
					// console.log("TARGET USER:", targetUser);
					if (!targetUser) {
						socket.emit("friendRequestError", "User not found.");
						return;
					}
					targetUserId = targetUser.id;

					// Vérifier si une demande d'ami existe déjà entre les deux utilisateurs
					const existingRequest =
						await this.FriendshipService.getFriendship(
							Number(requesterId),
							targetUserId
						);
					if (
						existingRequest &&
						existingRequest.status === "pending"
					) {
						const amITheRequester =
							await this.FriendshipService.amITheRequester(
								Number(requesterId),
								existingRequest
							);
						if (!amITheRequester) {
							await this.acceptFriendRequest(
								requesterId,
								targetUser,
								existingRequest,
								socket
							);
							shouldExit = true;
							return;
						}
					}
					if (
						existingRequest &&
						(existingRequest.status === "accepted" ||
							existingRequest.status === "blocked" ||
							existingRequest.status === "pending")
					) {
						socket.emit(
							"friendRequestError",
							"Cannot add that friend."
						);
						return;
					}

					// Obtenir les entités utilisateur pour l'expéditeur et le destinataire de la demande d'ami
					requesterUser = await this.UserService.getUserById(
						requesterId
					);

					// Envoyer la demande d'ami
					await this.FriendshipService.createFriendship(
						requesterUser,
						targetUser
					);
				}
			);
			if (shouldExit) {
				return;
			}
			// Informer l'utilisateur cible de la nouvelle demande d'ami
			const targetSocketId = Object.keys(this.userSessions).find(
				(key) => this.userSessions[key] === target.username
			);

			if (targetSocketId) {
				// console.log("Emit friendRequestReceived to:", targetSocketId);
				this.server
					.to(targetSocketId)
					.emit("friendRequestReceived", requesterUser!.username);
			}

			// Informer l'utilisateur demandeur que la demande a été envoyée
			socket.emit("friendRequestSent", target.username);
		} catch (error) {
			console.error("Error sending friend request:", error);
			socket.emit(
				"friendRequestError",
				"An error occurred while sending the friend request."
			);
		}
	}

	@SubscribeMessage("getPendingFriendRequests")
	async handleGetPendingRequests(
		@ConnectedSocket() client: Socket
	): Promise<void> {
		const userId = (client.request as any).session.userId;
		if (userId) {
			const pendingRequests =
				await this.FriendshipService.getPendingFriendshipsForUser(
					userId.userId
				);
			const pendingSentRequests =
				await this.FriendshipService.getPendingFriendshipRequestsForUser(
					userId.userId
				);
			client.emit("pendingFriendRequests", {
				from: pendingRequests,
				sent: pendingSentRequests,
			});
		}
	}

	@SubscribeMessage("acceptFriendRequest")
	async handleAcceptFriendRequest(
		@MessageBody() data: { username: string },
		@ConnectedSocket() socket: Socket
	) {
		const userId = (socket.request as any).session.userId.userId;
		try {
			// console.log(
			// 	"INSIDE ACCEPT FRIEND REQUEST WITH DATA:",
			// 	data.username
			// );
			const targetUser = await this.UserService.getUserFromUsername(
				data.username
			);
			if (!targetUser) {
				socket.emit("friendRequestError", "User not found.");
				return;
			}
			const targetId = targetUser.id;
			const friendship = await this.FriendshipService.getFriendship(
				targetId,
				userId as number
			);
			if (!friendship || friendship.status !== FriendshipStatus.PENDING) {
				socket.emit(
					"friendRequestError",
					"Friend request not found or already accepted."
				);
				return;
			}
			await this.acceptFriendRequest(
				userId,
				targetUser,
				friendship,
				socket
			);
			// await this.FriendshipService.updateFriendshipStatus(
			// 	friendship,
			// 	FriendshipStatus.ACCEPTED
			// );
			// // Créer la relation d'amitié inverse
			// const reverseTargetUser = await this.UserService.getUserById(
			// 	userId
			// );
			// const reverseFriendship =
			// 	await this.FriendshipService.createFriendship(
			// 		reverseTargetUser,
			// 		targetUser
			// 	);
			// await this.FriendshipService.updateFriendshipStatus(
			// 	reverseFriendship,
			// 	FriendshipStatus.ACCEPTED
			// );
			// console.log("EMITTING friendRequestAccepted");
			// socket.emit(
			// 	"friendRequestAccepted",
			// 	targetUser.username,
			// 	targetUser.status as string
			// );
			// const friendSocketId = Object.keys(this.userSessions).find(
			// 	(key) =>
			// 		this.userSessions[key] === targetUser.username.toString()
			// );
			// console.log("LA 3");
			// if (friendSocketId) {
			// 	const acceptingUser = await this.UserService.getUserById(
			// 		userId
			// 	);

			// 	this.server
			// 		.to(friendSocketId)
			// 		.emit(
			// 			"friendRequestAcceptedNotification",
			// 			this.userSessions[socket.id],
			// 			acceptingUser.status
			// 		);
			// }
		} catch (error) {
			console.error("Error accepting friend request:", error);
			socket.emit(
				"friendRequestError",
				"An error occurred while accepting the friend request."
			);
		}
	}

	@SubscribeMessage("rejectFriendRequest")
	async handleRejectFriendRequest(
		@MessageBody() data: { username: string },
		@ConnectedSocket() socket: Socket
	) {
		const userId = (socket.request as any).session.userId.userId;
		try {
			const targetUser = await this.UserService.getUserFromUsername(
				data.username
			);
			if (!targetUser) {
				socket.emit("friendRequestError", "User not found.");
				return;
			}
			// console.log(
			// 	"INSIDE REJECT FRIEND REQUEST WITH:",
			// 	userId,
			// 	targetUser.id
			// );
			const targetId = targetUser.id;
			const friendship = await this.FriendshipService.getFriendship(
				targetId,
				userId as number
			);
			if (!friendship || friendship.status !== FriendshipStatus.PENDING) {
				socket.emit("friendRequestError", "Friend request not found.");
				return;
			}
			await this.FriendshipService.removeFriendship(friendship);
			socket.emit("friendRequestRejected", targetUser.username);
			const friendSocketId = Object.keys(this.userSessions).find(
				(key) =>
					this.userSessions[key] === targetUser.username.toString()
			);
			if (friendSocketId) {
				// console.log(
				// 	"this.userSessions[socket.id]=",
				// 	this.userSessions[socket.id]
				// );
				this.server
					.to(friendSocketId)
					.emit(
						"friendRequestRejectedNotification",
						this.userSessions[socket.id]
					);
			}
		} catch (error) {
			console.error("Error rejecting friend request:", error);
			socket.emit(
				"friendRequestError",
				"An error occurred while rejecting the friend request."
			);
		}
	}

	@SubscribeMessage("sendDeleteFriend")
	async handleDeleteFriend(
		@MessageBody() target: { username: string },
		@ConnectedSocket() socket: Socket
	) {
		try {
			const userId = (socket.request as any).session.userId.userId;

			const currentUser = await this.UserService.getUserById(userId);
			if (!currentUser) throw new Error("User is not authentified.");

			const friendToDelete = await this.UserService.getUserFromUsername(
				target.username
			);
			if (!friendToDelete) throw new Error("Friend not found");

			const friendship =
				await this.FriendshipService.getFriendshipFromUserToFriend(
					currentUser.id,
					friendToDelete.id
				);

			if (!friendship || friendship.status !== FriendshipStatus.ACCEPTED)
				throw new Error("You are not friends");

			const reverseFriendship =
				await this.FriendshipService.getFriendshipFromFriendToUser(
					currentUser.id,
					friendToDelete.id
				);

			if (
				!reverseFriendship ||
				reverseFriendship.status !== FriendshipStatus.ACCEPTED
			)
				throw new Error("You are not friends");

			if (friendship) {
				// console.log("deleting:", friendship);
				await this.FriendshipService.removeFriendship(friendship);
			}
			if (reverseFriendship) {
				// console.log("deleting:", reverseFriendship);
				await this.FriendshipService.removeFriendship(
					reverseFriendship
				);
			}

			socket.emit("friendDeleted", friendToDelete.username);

			const friendSocket = this.getSocketFromUsername(
				friendToDelete.username
			);
			if (friendSocket) {
				friendSocket.emit(
					"friendDeleted",
					this.userSessions[socket.id]
				);
			}
		} catch (error) {
			socket.emit("error", {
				message:
					(error as Error).message || "Error while deleting friend.",
			});
		}
	}

	@SubscribeMessage("updateQuote")
	async handleUpdateQuote(
		@MessageBody() data: { quote: string },
		@ConnectedSocket() socket: Socket
	) {
		const userId = (socket.request as any).session.userId;
		if (userId) {
			try {
				await this.UserService.updateUserQuote(
					userId.userId,
					data.quote
				);
				socket.emit("quoteUpdated", data.quote);

				// Envoyer à tous les autres clients si nécessaire
				// socket.broadcast.emit("userQuoteChanged", {
				// 	userId,
				// 	quote: data.quote,
				// });
			} catch (error) {
				socket.emit("quoteUpdateError", (error as Error).message);
			}
		}
	}

	@SubscribeMessage("createChannel")
	async handleCreateChannel(
		@MessageBody() data: { name: string; type: string; password: string },
		@ConnectedSocket() socket: Socket
	) {
		const userId = (socket.request as any).session.userId.userId;
		if (!userId) {
			socket.emit(
				"channelCreationError",
				"You must be logged in to create a channel."
			);
			return;
		}

		//verification du nom du channel
		const checkName = await this.checkChannelName(data.name);
		if (checkName !== true) {
			socket.emit("channelCreationError", checkName);
			return;
		}
		// Vérification de l'existence du channel
		try {
			const channelExists = await this.channelService.getChannelbyName(
				data.name
			);
			if (channelExists) {
				socket.emit(
					"channelCreationError",
					"Channel with this name already exists."
				);
				return;
			}
		} catch (error) {
			// Création du channel
			try {
				const saltRounds = 10;
				let hashedPassword: string = "";

				if (data.password) {
					hashedPassword = await bcrypt.hash(
						data.password,
						saltRounds
					);
				}

				const channelType = this.mapStringToChannelType(data.type);

				const channel = await this.channelService.createChannel(
					data.name,
					userId,
					channelType,
					hashedPassword
				);
				socket.emit("channelCreated", channel);

				if (this.userChannels[socket.id]) {
					this.userChannels[socket.id].push(channel.id.toString());
				} else {
					this.userChannels[socket.id] = [channel.id.toString()];
				}

				// L'utilisateur qui crée le channel est défini comme "Owner"
				await this.channelUserService.joinChannel(
					userId,
					channel.id,
					UserRole.OWNER
				);
				socket.join(channel.id.toString());
				socket.emit("joinedChannel", channel.name, channel.id);
			} catch (error) {
				if (error instanceof Error) {
					socket.emit("channelCreationError", error.message);
				}
			}
		}
	}

	@SubscribeMessage("kickUser")
	async handleKickUser(
		@MessageBody() data: { usernameToKick: string; channelName: string },
		@ConnectedSocket() socket: Socket
	): Promise<void> {
		const adminOrOwnerId = (socket.request as any).session.userId.userId;
		const channelId = Number(this.activeChannel[socket.id]);
		if (isNaN(channelId)) {
			throw new Error("Channel ID is not a number(NaN).");
		}

		try {
			const userToKick = await this.UserService.getUserFromUsername(
				data.usernameToKick
			);

			if (!userToKick) {
				throw new NotFoundException("User not found.");
			}
			await this.channelUserService.kickUser(
				channelId,
				adminOrOwnerId,
				userToKick.id
			);

			//get the target socket
			const targetSocketId = Object.keys(this.userSessions).find(
				(key) => this.userSessions[key] === userToKick.username
			);
			if (!targetSocketId) {
				throw new Error("Target socket ID not found.");
			}

			const targetSocket =
				this.server.sockets.sockets.get(targetSocketId);

			if (!targetSocket) {
				throw new Error("Target socket object not found.");
			}

			this.sendServerMessage(
				channelId.toString(),
				`${userToKick.username} was kicked from the channel.`
			);
			targetSocket.leave(channelId.toString());

			if (this.userChannels[targetSocketId]) {
				const index = this.userChannels[targetSocketId].indexOf(
					channelId.toString()
				);
				if (index > -1) {
					this.userChannels[targetSocketId].splice(index, 1);
				}
			}

			if (
				this.activeChannel[targetSocketId] &&
				this.activeChannel[targetSocketId] == channelId.toString()
			) {
				delete this.activeChannel[targetSocketId];
			}
			targetSocket.emit("kickedFromChannel", data.channelName);
			socket.emit("userKicked", {
				username: userToKick.username,
				channelId: channelId,
			});
		} catch (error) {
			socket.emit("error", (error as Error).message);
		}
	}

	@SubscribeMessage("banUser")
	async handleBanUser(
		@MessageBody() data: { usernameToBan: string; channelName: string },
		@ConnectedSocket() socket: Socket
	) {
		const adminOrOwnerId = (socket.request as any).session.userId.userId;
		const targetSocketId = Object.keys(this.userSessions).find(
			(key) => this.userSessions[key] === data.usernameToBan
		);
		if (!targetSocketId) {
			throw new Error("Target socket ID not found.");
		}
		const targetSocket = this.server.sockets.sockets.get(targetSocketId);
		if (!targetSocket) {
			throw new Error("Target socket object not found.");
		}
		const channelId = Number(this.activeChannel[socket.id]);
		try {
			const userToBan = await this.UserService.getUserFromUsername(
				data.usernameToBan
			);

			if (!userToBan) {
				throw new NotFoundException("User not found.");
			}
			await this.channelUserService.banUser(
				channelId,
				adminOrOwnerId,
				userToBan.id
			);
			targetSocket.emit("bannedFromChannel", data.channelName);
			socket.emit("userBanned", {
				username: userToBan.username,
				channelId: channelId,
			});
			this.sendServerMessage(
				channelId.toString(),
				`${userToBan.username} was banned from the channel.`
			);
			targetSocket.leave(channelId.toString());
			if (this.userChannels[targetSocket.id]) {
				const index = this.userChannels[targetSocket.id].indexOf(
					channelId.toString()
				);
				if (index > -1) {
					this.userChannels[targetSocket.id].splice(index, 1);
				}
			}
			if (
				this.activeChannel[targetSocket.id] &&
				this.activeChannel[targetSocket.id] == channelId.toString()
			) {
				delete this.activeChannel[targetSocket.id];
			}
		} catch (error) {
			socket.emit("error", (error as Error).message);
		}
	}

	@SubscribeMessage("muteUser")
	async handleMuteUser(
		@MessageBody()
		data: {
			usernameToMute: string;
			muteDuration: number;
		},
		@ConnectedSocket() socket: Socket
	) {
		const adminOrOwnerId = (socket.request as any).session.userId.userId;
		if (!adminOrOwnerId || !data.usernameToMute) {
			socket.emit("error", "Bad request.");
			return;
		}
		const channelId = Number(this.activeChannel[socket.id]);
		if (isNaN(channelId)) {
			throw new Error("Channel ID is not a number(NaN).");
		}
		if (
			!this.channelUserService.hasAdminRights(channelId, adminOrOwnerId)
		) {
			socket.emit("error", "Unauthorized request.");
			return;
		}
		try {
			const userToMute = await this.UserService.getUserFromUsername(
				data.usernameToMute
			);

			if (!userToMute) {
				throw new NotFoundException("User not found.");
			}

			if (!this.mutedUsers[channelId]) {
				this.mutedUsers[channelId] = {};
			}

			if (this.mutedUsers[channelId][userToMute.id]) {
				clearTimeout(this.mutedUsers[channelId][userToMute.id].timeout);
				delete this.mutedUsers[channelId][userToMute.id];
			}

			this.mutedUsers[channelId][userToMute.id] = {
				timeout: setTimeout(() => {
					delete this.mutedUsers[channelId][userToMute.id];
				}, data.muteDuration * 1000),
				startedAt: Date.now(),
				duration: data.muteDuration * 1000,
			};

			socket.emit("userMuted", {
				username: userToMute.username,
				channelId: channelId,
				muteDuration: data.muteDuration,
			});
			const readableDuration = this.msToHumanReadable(
				data.muteDuration * 1000
			);
			this.sendServerMessage(
				channelId.toString(),
				`${userToMute.username} was muted for ${readableDuration}.`
			);
		} catch (error) {
			socket.emit("error", (error as Error).message);
		}
	}
	@SubscribeMessage("updateChannel")
	async handleUpdateChannel(
		@MessageBody()
		data: { channelName: string; password?: string; channelType?: string },
		@ConnectedSocket() socket: Socket
	) {
		const userId = (socket.request as any).session.userId.userId;
		if (!userId) {
			socket.emit(
				"channelUpdateError",
				"You must be logged in to update a channel."
			);
			return;
		}

		try {
			const channel = await this.channelService.getChannelbyName(
				data.channelName
			);
			let updatedChannel = channel;
			if (channel.ownerId !== Number(userId)) {
				socket.emit(
					"channelUpdateError",
					"You are not the owner of this channel."
				);
				return;
			}

			if (data.channelType) {
				const mappedChannelType = this.mapStringToChannelType(
					data.channelType
				);

				// Check if a password is needed
				if (
					mappedChannelType === ChannelType.PASSWORD_PROTECTED &&
					!data.password
				) {
					socket.emit(
						"channelUpdateError",
						"A password is required for password-protected channels."
					);
					return;
				}
				// Update the channel type
				updatedChannel = await this.channelService.updateChannelType(
					channel.id,
					mappedChannelType
				);
			}

			// Update the channel password if needed
			if (
				data.channelType === "password_protected" ||
				(channel.type === ChannelType.PASSWORD_PROTECTED &&
					data.password)
			) {
				if (!data.password) {
					socket.emit(
						"channelUpdateError",
						"A password is required for password-protected channels."
					);
					return;
				}
				updatedChannel =
					await this.channelService.updateChannelPassword(
						channel.id,
						data.password
					);
			}

			socket.emit("channelUpdated", {
				channelName: data.channelName,
				channelType: updatedChannel.type,
			});
		} catch (error) {
			if (error instanceof Error) {
				socket.emit("error", error.message);
			}
		}
	}

	// @SubscribeMessage("leaveChannel")
	// async handleLeaveChannel(
	// 	@MessageBody() data: { channelName: string },
	// 	@ConnectedSocket() socket: Socket
	// ) {
	// 	// Extraction du userId pour éviter les répétitions
	// 	const userSession = (socket.request as any).session.userId;
	// 	if (!userSession) {
	// 		socket.emit(
	// 			"channelLeaveError",
	// 			"You must be logged in to leave a channel."
	// 		);
	// 		return;
	// 	}
	// 	const userId = userSession.userId;
	// 	try {
	// 		// Trouver le channel par son nom
	// 		const channel = await this.channelService.getChannelbyName(
	// 			data.channelName
	// 		);
	// 		if (!channel) {
	// 			socket.emit(
	// 				"channelLeaveError",
	// 				`Channel with name ${data.channelName} does not exist.`
	// 			);
	// 			return;
	// 		}

	// 		// Vérifier si l'utilisateur est déjà dans le canal
	// 		const channelUser = await this.channelUserService.getChannelUser(
	// 			channel.id,
	// 			userId
	// 		);

	// 		// Supprimer l'utilisateur du canal
	// 		await this.channelUserService.leaveChannel(userId, channelUser.id);
	// 		socket.emit("channelLeft", channel.name);

	// 		// Mettre à jour les variables du gateway
	// 		const index = this.userChannels[socket.id]?.indexOf(
	// 			channel.id.toString()
	// 		);
	// 		if (index > -1) {
	// 			this.userChannels[socket.id].splice(index, 1);
	// 		}
	// 		if (this.activeChannel[socket.id] === channel.name) {
	// 			delete this.activeChannel[socket.id];
	// 		}
	// 	} catch (error) {
	// 		if (error instanceof Error) {
	// 			socket.emit("channelLeaveError", error.message);
	// 		}
	// 	}
	// }
	@SubscribeMessage("leaveChannel")
	async handleLeaveChannel(
		@MessageBody() data: { channelName: string },
		@ConnectedSocket() socket: Socket
	): Promise<void> {
		// Vérification de la session
		const userSession = (socket.request as any).session.userId;
		if (!userSession) {
			socket.emit(
				"channelLeaveError",
				"You must be logged in to leave a channel."
			);
			return;
		}

		// Récupération du userId
		const userId = Number(userSession.userId);
		const user = await this.UserService.getUserById(userId);

		try {
			// Trouver le canal par son nom
			const channel = await this.channelService.getChannelbyName(
				data.channelName
			);
			if (!channel) {
				socket.emit("channelLeaveError", "Channel not found.");
				return;
			}

			// Vérifiez si l'utilisateur est dans le canal
			if (
				!this.userChannels[socket.id]?.includes(channel.id.toString())
			) {
				socket.emit(
					"channelLeaveError",
					"You are not in this channel."
				);
				return;
			}

			// Retirer l'utilisateur du canal
			await this.channelUserService.leaveChannel(userId, channel.id);

			// Mise à jour des structures de données côté serveur
			const index = this.userChannels[socket.id].indexOf(
				channel.id.toString()
			);
			if (index > -1) {
				this.userChannels[socket.id].splice(index, 1);
			}
			if (this.activeChannel[socket.id] === channel.id.toString()) {
				delete this.activeChannel[socket.id];
			}

			socket.leave(channel.id.toString());

			// Avertir l'utilisateur
			socket.emit("kickedFromChannel", data.channelName);

			// Envoyer un message au canal pour informer que l'utilisateur a quitté le canal
			this.sendServerMessage(
				channel.id.toString(),
				`${user.username} has left the channel.`
			);
		} catch (error) {
			socket.emit("error", (error as Error).message);
		}
	}
}
