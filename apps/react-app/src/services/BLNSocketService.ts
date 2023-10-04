import { Socket } from "socket.io-client";
import createPongSocket from "../pongSocket";

type FriendRequest = {
	username: string;
	message?: string;
};

export enum UserRole {
	OWNER = "owner",
	ADMIN = "admin",
	MEMBER = "member",
}

type FriendRequests = {
	from: FriendRequest[];
	sent: FriendRequest[];
};

class SocketService {
	private static instance: SocketService;
	private socket: Socket;
	private isBlnClosed = false;
	private notificationCallback: Function = () => {};
	private initBlnDone = false;
	private initAppDone = false;
	blockList: { username: string }[];

	constructor() {
		this.socket = createPongSocket();
		this.blockList = [];
	}

	public static getInstance(): SocketService {
		if (!SocketService.instance) {
			SocketService.instance = new SocketService();
		}
		return SocketService.instance;
	}

	// Pour l'émission d'événements
	emit(event: string, data: any) {
		if (event === "InitBLN") {
			if (this.initBlnDone === false) {
				this.socket.emit(event, data);
				this.initBlnDone = false;
			}
		} else if (event === "InitApp") {
			if (this.initAppDone === false) {
				this.socket.emit(event, data);
				this.initAppDone = true;
			}
		} else {
			this.socket.emit(event, data);
		}
	}

	emitNoData(event: string) {
		this.socket.emit(event);
	}

	setBlnClosed(value: boolean) {
		this.isBlnClosed = value;
	}

	setNotificationCallback(callback: Function) {
		this.notificationCallback = callback;
	}

	// Pour écouter les événements
	listenToJoinedChannel(callback: Function) {
		this.socket.off("joinedChannel");
		this.socket.on(
			"joinedChannel",
			(channelName: string, channelId: number) => {
				console.log(
					"DANS LISTEN TO JOIN CHANNEL AVEC",
					channelName,
					channelId
				);
				// Mettre à jour le sessionStorage avec le nouveau canal
				const joinedChannels =
					this.getFromSessionStorage("joinedChannels") || [];
				if (!joinedChannels.includes(channelName)) {
					this.saveToSessionStorage("joinedChannels", [
						...joinedChannels,
						channelName,
					]);
				}

				// Ensuite, appeler le callback pour informer le composant ou tout autre consommateur du service
				callback(channelName, channelId);
			}
		);
	}
	listenToPing(callback: Function) {
		this.socket.off("ping");
		this.socket.on("ping", () => {
			callback();
		});
	}
	listentoUserJoinedChannel(callback: Function) {
		this.socket.off("userJoinedChannel");
		this.socket.on("userJoinedChannel", (data) => {
			callback(data);
		});
	}

	listenToUpdateRole(
		callback: (data: { username: string; role: string }) => void
	) {
		this.socket.off("updateRole");
		this.socket.on("updateRole", (data) => {
			callback(data);
		});
	}

	listenToKickedFromChannel(callback: Function) {
		this.socket.off("kickedFromChannel");
		this.socket.on("kickedFromChannel", (channelName: string) => {
			console.log("Kicked from channel:", channelName);
			callback(channelName);
		});
	}

	listenToBannedFromChannel(callback: Function) {
		this.socket.off("bannedFromChannel");
		this.socket.on("bannedFromChannel", (channelName: string) => {
			console.log("Banned from channel:", channelName);
			callback(channelName);
		});
	}
	listenToSessionExpired(callback: Function) {
		this.socket.off("sessionExpired");
		this.socket.on("sessionExpired", () => {
			callback();
		});
	}
	listenToFriendshipsRetrieved(callback: (friendships: any[]) => void) {
		this.socket.off("friendshipsRetrieved");
		this.socket.on("friendshipsRetrieved", (friendships) => {
			console.log("BLN friendships =", friendships);
			callback(friendships);
		});
	}

	listenToChannelsRetrieved(callback: (channels: any[]) => void) {
		this.socket.off("channelsRetrieved");
		this.socket.on("channelsRetrieved", (channels) => {
			callback(channels);
		});
	}

	listenToStatusUpdate(
		callback: (retrievedFriends: {
			username: string;
			status: string;
		}) => void
	) {
		this.socket.off("statusUpdate");
		this.socket.on(
			"statusUpdate",
			(retrievedFriends: { username: string; status: string }) => {
				console.log("Status update received:", retrievedFriends);
				callback(retrievedFriends);
			}
		);
	}
	updateBlockList(newBlockList: { username: string }[]) {
		this.blockList = newBlockList;
	}
	listenToMessages(
		channelId: number,
		channelName: string,
		callback: (data: {
			user: string;
			message: string;
			channelName: string;
		}) => void
	) {
		this.socket.off("message-" + channelId);
		this.socket.on("message-" + channelId, ({ user, message }) => {
			console.log(`Message received on channel ${channelId}:`, {
				user,
				message,
			});
			if (
				this.blockList.some(
					(blockedUser) => blockedUser.username === user
				)
			) {
				return;
			}
			const chats = this.getFromSessionStorage("chats") || {};
			chats[channelName] = chats[channelName] || [];
			chats[channelName].push({ user, message }); // Sauvegarde du nouveau message.
			this.saveToSessionStorage("chats", chats);
			if (this.isBlnClosed) {
				this.notificationCallback({
					username: user,
					message: message,
					channelName: channelName,
				});
			}
			callback({ user, message, channelName });
		});
	}

	listenToPM(
		callback: (data: {
			user: string;
			message: string;
			channelName: string;
		}) => void
	) {
		this.socket.off("PrivateMessage");
		this.socket.on("PrivateMessage", ({ user, message, channelName }) => {
			if (
				this.blockList.some(
					(blockedUser) => blockedUser.username === user
				)
			) {
				return;
			}
			const chats = this.getFromSessionStorage("chats") || {};
			chats[channelName] = chats[channelName] || [];
			chats[channelName].push({ user, message }); // Sauvegarde du nouveau message.
			this.saveToSessionStorage("chats", chats);

			// Si la fenêtre de chat est fermée, envoyer une notification.
			if (this.isBlnClosed) {
				this.notificationCallback({
					username: user,
					message: message,
					channelName: channelName,
				});
			}
			callback({ user, message, channelName });
		});
	}

	listenToSwitchedChannel(
		callback: (
			channelName: string,
			channelId: number,
			usersWithRoles: {
				username: string;
				role: UserRole;
			}[],
			channelType: string
		) => void
	) {
		this.socket.off("switchedChannel");
		this.socket.on(
			"switchedChannel",
			(channelName, channelId, usersWithRoles, channelType) => {
				callback(channelName, channelId, usersWithRoles, channelType);
			}
		);
	}

	listenToSwitchedToPrivate(
		callback: (data: {
			channelName: string;
			friendName: string;
			friendAvatar: string;
			friendQuote: string;
		}) => void
	) {
		this.socket.off("switchedToPrivate");
		this.socket.on("switchedToPrivate", (data) => {
			callback(data);
		});
	}

	listenToChannelNotFound(callback: () => void) {
		this.socket.off("channelNotFound");
		this.socket.on("channelNotFound", () => {
			callback();
		});
	}

	listenToChannelCreated(callback: (channel: any) => void) {
		this.socket.off("channelCreated");
		this.socket.on("channelCreated", (channel) => {
			callback(channel);
		});
	}

	listenToChannelUpdated(
		callback: (channelName: string, channelType: string) => void
	) {
		this.socket.off("channelUpdated");
		this.socket.on("channelUpdated", (channel) => {
			callback(channel.channelName, channel.channelType);
		});
	}

	listenToChannelUpdateError(callback: (errorMsg: string) => void) {
		this.socket.off("channelUpdateError");
		this.socket.on("channelUpdateError", (errorMsg) => {
			callback(errorMsg);
		});
	}

	listenToChannelAccessError(callback: (errorMsg: string) => void) {
		this.socket.off("channelAccessError");
		this.socket.on("channelAccessError", (errorMsg) => {
			callback(errorMsg);
		});
	}

	listenToPasswordRequired(callback: (errorMsg: string) => void) {
		this.socket.off("passwordRequired");
		this.socket.on("passwordRequired", (errorMsg) => {
			callback(errorMsg);
		});
	}

	listenToChannelCreationError(callback: (error: string) => void) {
		this.socket.off("channelCreationError");
		this.socket.on("channelCreationError", (error) => {
			callback(error);
		});
	}

	sendMessage(message: string) {
		if (message.trim() === "") return;
		this.socket.emit("sendMessage", { message });
	}

	sendGameInvitation(username: string) {
		this.socket.emit("sendGameInvitation", { username });
	}
	listenTogameInviteSent(callback: (username: string) => void) {
		this.socket.off("gameInviteSent");
		this.socket.on("gameInviteSent", (username) => {
			callback(username);
		});
	}
	// listenToGameInviteCanceled(callback: (username?: string) => void) {
	// 	this.socket.off("gameInviteCanceled");
	// 	this.socket.on("gameInviteCanceled", (username) => {
	// 		callback(username);
	// 	});
	// }
	listenToGameInviteCanceled(
		callback: (data?: string | { username: string }) => void
	) {
		this.socket.off("gameInviteCanceled");
		this.socket.on("gameInviteCanceled", (data) => {
			callback(data);
		});
	}

	joinChannelByName(channelName: string, channelPassword: string) {
		this.socket.emit("joinChannelByName", { channelName, channelPassword });
	}

	switchChannel(channelName: string) {
		console.log("Dans le switch channel avec:", channelName);
		this.socket.emit("switchChannelByName", { channelName });
	}

	createChannel(name: string, type: string, password: string) {
		this.socket.emit("createChannel", {
			name,
			type,
			password,
		});
	}

	listenToQuoteRetrieved(callback: (quote: string) => void) {
		this.socket.off("quoteRetrieved");
		this.socket.on("quoteRetrieved", (quote) => {
			console.log("Cote client quote retrieved:", quote);
			callback(quote);
		});
	}

	updateUserQuote(quote: string) {
		this.emit("updateQuote", { quote });
	}

	listenToQuoteUpdated(callback: (quote: string) => void) {
		this.socket.off("quoteUpdated");
		this.socket.on("quoteUpdated", (quote) => {
			console.log("Quote reçu:", quote);
			callback(quote);
		});
	}

	listenToQuoteUpdateError(callback: (errorMsg: string) => void) {
		this.socket.off("quoteUpdateError");
		this.socket.on("quoteUpdateError", (errorMsg) => {
			callback(errorMsg);
		});
	}
	getPendingFriendRequests() {
		this.socket.emit("getPendingFriendRequests");
	}

	listenToPendingFriendRequests(
		callback: (requests: FriendRequests) => void
	) {
		this.socket.off("pendingFriendRequests");
		this.socket.on("pendingFriendRequests", (data) => {
			callback(data);
		});
	}

	listenToFriendRequestSent(callback: (username: string) => void) {
		this.socket.off("friendRequestSent");
		this.socket.on("friendRequestSent", (username) => {
			callback(username);
		});
	}

	sendFriendRequest(username: string) {
		this.socket.emit("sendFriendRequest", { username });
	}

	sendDeleteFriend(username: string) {
		this.socket.emit("sendDeleteFriend", { username });
	}
	leaveChannel(channelName: string) {
		this.socket.emit("leaveChannel", { channelName });
	}

	acceptFriendRequest(username: string) {
		console.log(
			"Je suis le client et j'emit acceptFriendRequest avec",
			username
		);
		this.socket.emit("acceptFriendRequest", { username });
	}

	rejectFriendRequest(username: string) {
		this.socket.emit("rejectFriendRequest", { username });
	}

	listenToGameInviteReceived = (callback: (username: string) => void) => {
		this.socket.off("gameInviteReceived");
		this.socket.on("gameInviteReceived", (username) => {
			callback(username);
		});
	};
	listenToPongGameRequestError = (callback: (errorMsg: string) => void) => {
		this.socket.off("pongGameRequestError");
		this.socket.on("pongGameRequestError", (errorMsg) => {
			callback(errorMsg);
		});
	};
	acceptGameInvitation(username: string) {
		this.socket.emit("acceptGameInvitation", { username });
	}
	listenToGameInviteAccepted(callback: (username: string) => void) {
		this.socket.off("gameInviteAccepted");
		this.socket.on("gameInviteAccepted", (username) => {
			callback(username);
		});
	}
	rejectGameInvitation(username: string) {
		this.socket.emit("declineGameInvitation", { username });
	}

	listenToFriendRequest(callback: (username: string) => void) {
		this.socket.off("friendRequestReceived");
		this.socket.on("friendRequestReceived", (username) => {
			console.log("Salut dans listenToFriendRequest=", username);
			callback(username);
		});
	}

	listenToFriendAccepted(
		callback: (username: string, status: string) => void
	) {
		this.socket.off("friendRequestAccepted");
		this.socket.on("friendRequestAccepted", (username, status) => {
			callback(username, status);
		});
	}

	listenToFriendDeleted(callback: (username: string) => void) {
		this.socket.off("friendDeleted");
		this.socket.on("friendDeleted", (username) => {
			console.log("friendDeleted recu dans le client avec:", username);
			callback(username);
		});
	}

	listenToFriendRequestAcceptedNotification(
		callback: (username: string, status: string) => void
	) {
		this.socket.off("friendRequestAcceptedNotification");
		this.socket.on(
			"friendRequestAcceptedNotification",
			(username, status) => {
				callback(username, status);
			}
		);
	}

	listenToFriendRejected(callback: (username: string) => void) {
		this.socket.off("friendRequestRejected");
		this.socket.on("friendRequestRejected", (username) => {
			callback(username);
		});
	}

	listenToFriendRequestRejectedNotification(
		callback: (username: string) => void
	) {
		this.socket.off("friendRequestRejectedNotification");
		this.socket.on("friendRequestRejectedNotification", (username) => {
			callback(username);
		});
	}

	listenToUserBanned(
		callback: (username: string, channelId: number) => void
	) {
		this.socket.off("userBanned");
		this.socket.on("userBanned", (data) => {
			console.log("User banned:", data.username);
			callback(data.username, data.channelId);
		});
	}

	listenToUserKicked(
		callback: (username: string, channelId: number) => void
	) {
		this.socket.off("userKicked");
		this.socket.on("userKicked", (data) => {
			console.log(
				`User ${data.username} kicked from channel ID: ${data.channelId}`
			);
			callback(data.username, data.channelId);
		});
	}

	listenToUserMuted(callback: (username: string, duration: number) => void) {
		this.socket.off("userMuted");
		this.socket.on("userMuted", (data) => {
			console.log(
				`User ${data.username} muted for ${data.muteDuration} minutes`
			);
			callback(data.username, data.muteDuration);
		});
	}

	// Pour gérer la session storage
	saveToSessionStorage(key: string, value: any) {
		try {
			const serializedValue = JSON.stringify(value);
			sessionStorage.setItem(key, serializedValue);
		} catch (error) {
			console.error("Failed to save to sessionStorage:", error);
		}
	}

	getFromSessionStorage(key: string) {
		try {
			const serializedValue = sessionStorage.getItem(key);
			return serializedValue ? JSON.parse(serializedValue) : null;
		} catch (error) {
			console.error("Failed to get from sessionStorage:", error);
			return null;
		}
	}
}

export default SocketService;
