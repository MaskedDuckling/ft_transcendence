import {
	ConnectedSocket,
	MessageBody,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from "@nestjs/websockets";
import { OnModuleInit } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { UserService } from "../app/service/user.service";
import { sessionMiddleware } from "../app/sessionMiddleware";
import { UserStatus } from "../app/entities/user.entity";
import { FriendshipService } from "../app/service/friendship.service";

@WebSocketGateway({
	cors: {
		origin: process.env.REACT_URL,
		methods: ["GET", "POST"],
		credentials: true,
	},
})
export class UserStatusGateway implements OnModuleInit {
	constructor(
		private UserService: UserService,
		private FriendshipService: FriendshipService
	) {}

	@WebSocketServer()
	server!: Server;

	private userSessions: Record<string, string> = {}; // Contient les noms d'utilisateur associés à chaque socket ID
	private userStatuses: Record<string, string> = {}; // Contient les statuts des utilisateurs par socket ID
	public getUserStatuses(socketId: string) {
		return this.userStatuses[socketId];
	}

	onModuleInit() {
		const io = this.server; // Récupère le serveur io sous-jacent
		io.engine.use(sessionMiddleware);

		io.on("connection", async (socket) => {
			const userid = (socket.request as any).session.userId;
			if (userid) {
				const user = await this.UserService.getUserById(userid.userId);
				this.userSessions[socket.id] = user.username;
				this.handleUpdateStatus({ status: UserStatus.ONLINE }, socket);
			}
			socket.on("disconnect", async () => {
				await this.handleUpdateStatus(
					{ status: UserStatus.OFFLINE },
					socket
				);
				delete this.userStatuses[socket.id];
				delete this.userSessions[socket.id];
			});
		});
	}
	
	public getUserStatusBySocket(socket: Socket): string {
		return this.userStatuses[socket.id];
	}
  

	@SubscribeMessage("updateStatus")
	async handleUpdateStatus(
		@MessageBody() data: { status: UserStatus },
		@ConnectedSocket() socket: Socket
	) {
		const userid = (socket.request as any).session.userId;
		if (userid) {
			try {
				// Mise à jour du statut dans la base de données
				await this.UserService.updateUserStatus(
					userid.userId,
					data.status
				);

				// Puis, diffusez le nouveau statut à tous les clients connectés.
				this.userStatuses[socket.id] = data.status;
				const friends =
					await this.FriendshipService.getFriendshipsForUser(
						userid.userId
					);
				for (let friend of friends) {
					const friendSocketId = Object.keys(this.userSessions).find(
						(key) => this.userSessions[key] === friend.username
					);
					if (friendSocketId) {
						this.server.to(friendSocketId).emit("statusUpdate", {
							username: this.userSessions[socket.id],
							status: data.status as string,
						});
					}
				}
			} catch (error) {
				console.error("Error updating status:", error);
			}
		}
	}
}
