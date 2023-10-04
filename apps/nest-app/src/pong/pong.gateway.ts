import {
	ConnectedSocket,
	MessageBody,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
	WsResponse,
} from "@nestjs/websockets";
import { OnModuleInit } from "@nestjs/common";
import { Socket, Server } from "socket.io";
import { sessionMiddleware } from "../app/sessionMiddleware";
import { UserService } from "../app/service/user.service";
import { User, UserStatus } from "../app/entities/user.entity";
import { MatchHistoryService } from "../app/service/matchHistory.service";
import { UserStatsService } from "../app/service/userStats.service";
import { UserStatusGateway } from "../userStatus/userStatus.gateway";

type PlayerQueueItem = {
	socket: Socket;
	user: User;
};

type GameRoom = {
	countdownInterval?: NodeJS.Timer;
	movementInterval?: NodeJS.Timer;
	client1Id: string;
	client2Id: string;
	playersInput: Record<string, { [key: string]: boolean }>;
	gameState: any;
};

type InternalState = {
	ballDirX: number;
	ballDirY: number;
	speed: number;
	hitCount: number;
	waitRespawn: number;
};

const ORIGINAL_SPEED = 8;
const SPEED_INCREASE_INTERVALS = [4, 12];
const MAX_SCORE = 11;
const RESPAWN_COUNT = 50;
const FRAME_RATE = 16;
const MAX_Y_SPEED = 1;

const paddleSpeed = 11;
const gameSize = {
	width: 800,
	height: 600,
};
const paddleSize = {
	width: 8,
	height: 42,
};
const paddlePositions = {
	player1: {
		x: 50,
		y: (gameSize.height - paddleSize.height) / 2,
	},
	player2: {
		x: gameSize.width - 50 - paddleSize.width,
		y: (gameSize.height - paddleSize.height) / 2,
	},
};
const ballSize = {
	radius: 5,
};
const ballPosition = {
	x: gameSize.width / 2 - ballSize.radius,
	y: gameSize.height / 2 - ballSize.radius,
};
const initialScore = {
	player1: 0,
	player2: 0,
};

@WebSocketGateway({
	cors: {
		origin: process.env.REACT_URL,
		methods: ["GET", "POST"],
		credentials: true,
	},
})
export class PongGateway implements OnModuleInit {
	constructor(
		private UserService: UserService,
		private matchHistoryService: MatchHistoryService,
		private userStatsService: UserStatsService,
		private userStatusGateway: UserStatusGateway
	) {}
	@WebSocketServer()
	server!: Server;
	queue: PlayerQueueItem[] = [];

	gameRooms: Record<string, GameRoom> = {};

	userSessions: Record<string, User> = {};

	onModuleInit() {
		const io = this.server; // Get the underlying io server
		io.engine.use(sessionMiddleware);
		io.on("connection", (socket) => {
			const userid = (socket.request as any).session.userId;
			if (userid) {
				this.UserService.getUserById(userid.userId)
					.then((user) => {
						this.userSessions[socket.id] = user;
					})
					.catch((error) => {
						console.error("Error fetching user:", error);
					});
			}
		});
	}

	handleDisconnect(client: Socket): void {
		this.leaveGame(client);
		delete this.userSessions[client.id];
	}

	private leaveGame(client: Socket): void {
		const index = this.queue.findIndex(
			(queueItem) => queueItem.socket === client
			);
			if (index >= 0) {
				this.queue.splice(index, 1);
			}
		const gameRoom = Object.keys(this.gameRooms).find((room) => room.includes(client.id));
		if (!gameRoom) {
			return; // Pas de salle de jeu associée à ce client, rien à faire
		}
	
		const room = this.gameRooms[gameRoom];
		const otherClientId = room.client1Id === client.id ? room.client2Id : room.client1Id;
		const otherClient = this.server.sockets.sockets.get(otherClientId);
		// Si le client est en pleine partie, terminer la partie
		
		const user1 = this.userSessions[room.client1Id];
		const user2 = this.userSessions[room.client2Id];

		if (this.userStatusGateway.getUserStatuses(client.id) === UserStatus.INTRAINING) {
			this.userStatusGateway.handleUpdateStatus(
				{ status: UserStatus.ONLINE },
				client
			);
			if (this.gameRooms[gameRoom]?.countdownInterval) {
				clearInterval(this.gameRooms[gameRoom].countdownInterval);
			}
			if (this.gameRooms[gameRoom]?.movementInterval) {
				clearInterval(this.gameRooms[gameRoom].movementInterval);
			}
			delete this.gameRooms[gameRoom];

			return;
		}
		
		// Supposons que vous ayez un accès à l'état du jeu ici.

		// Sinon, récupérez-le à partir de `room` ou de toute autre source.
		const gameState = room.gameState;

		// Votre logique de score ici
		const isPlayer1 = room.client1Id === client.id;
		const outcomePlayer1 = !isPlayer1;
		const outcomePlayer2 = isPlayer1;
		const finalScore = `${gameState.score.player1} - ${gameState.score.player2}`;
		const date = new Date();

		this.matchHistoryService
			.createMatch(user1, user2, outcomePlayer1, finalScore, date)
			.catch((error) => {
				console.error("Error saving match:", error);
			});

		this.userStatsService.updateStatsAfterGame(user1.id, outcomePlayer1);
		this.userStatsService.updateStatsAfterGame(user2.id, outcomePlayer2);

	
		// Nettoyez les timers et intervalles associés à cette salle de jeu
		if (room.countdownInterval) {
			clearInterval(room.countdownInterval);
		}
		if (room.movementInterval) {
			clearInterval(room.movementInterval);
		}
	
		// Mettez à jour le statut des utilisateurs
		this.userStatusGateway.handleUpdateStatus({ status: UserStatus.ONLINE }, client);
		if (otherClient) {
			this.userStatusGateway.handleUpdateStatus({ status: UserStatus.ONLINE }, otherClient);
		}
	
		// Informez l'autre joueur que son adversaire a quitté le jeu
		this.server.to(gameRoom).emit("opponentLeft");
	
		// Supprimez la salle de jeu
		delete this.gameRooms[gameRoom];
	}
	getRoomByClientId(clientId: string): GameRoom | undefined {
		return Object.values(this.gameRooms).find(
			(room) => room.client1Id === clientId || room.client2Id === clientId
		);
	}

	handleGameOver(socket1: Socket) {
		const gameRoomKey = Object.keys(this.gameRooms).find((room) =>
			room.includes(socket1.id)
		);

		if (gameRoomKey) {
			const room = this.gameRooms[gameRoomKey];

			// Nettoyer les Timers
			clearInterval(this.gameRooms[gameRoomKey].countdownInterval);
			clearInterval(this.gameRooms[gameRoomKey].movementInterval);

			// Réinitialiser les entrées des joueurs
			this.gameRooms[gameRoomKey].playersInput = {
				[this.gameRooms[gameRoomKey].client1Id]: {},
				[this.gameRooms[gameRoomKey].client2Id]: {},
			};

			// Supprimer la salle
			delete this.gameRooms[gameRoomKey];

			const socket2 = this.server.sockets.sockets.get(room.client2Id);

			if (socket1) {
				this.userStatusGateway.handleUpdateStatus(
					{ status: UserStatus.ONLINE },
					socket1
				);
			}
			if (socket2) {
				this.userStatusGateway.handleUpdateStatus(
					{ status: UserStatus.ONLINE },
					socket2
				);
			}
		}
	}

	async handleAcceptInvite(
		@MessageBody() data: { friend: Socket },
		@ConnectedSocket() client: Socket
	): Promise<void> {
		const friendSocket = data.friend;
		if (friendSocket) {
			const roomId = client.id + "-" + friendSocket.id;
			await client.join(roomId);
			await friendSocket.join(roomId);

			this.gameRooms[roomId] = {
				client1Id: client.id,
				client2Id: friendSocket.id,
				playersInput: {},
				gameState: {},
			};
			setTimeout(() => {
				this.server.to(roomId).emit("matchFound", {
					roomId,
					player1: this.userSessions[client.id].username,
					player2: this.userSessions[friendSocket.id].username,
				});

				this.startGameRoom(roomId);
				//update both status
				this.userStatusGateway.handleUpdateStatus(
					{ status: UserStatus.INGAME },
					client
				);
				this.userStatusGateway.handleUpdateStatus(
					{ status: UserStatus.INGAME },
					friendSocket
				);
			}, 1000);
		}
	}

	@SubscribeMessage("gameState")
	handleGameState(@MessageBody() gameState: any): void {
		const roomId = gameState.roomId;
		this.server.to(roomId).emit("gameState", gameState);
	}

	@SubscribeMessage("keyPress")
	handleKeyPress(
		@MessageBody() data: { key: string; state: boolean },
		@ConnectedSocket() client: Socket
	): void {
		const room = this.getRoomByClientId(client.id);
		if (!room) {
			return;
		}

		if (!room.playersInput) {
			room.playersInput = {};
		}

		if (!room.playersInput[client.id]) {
			room.playersInput[client.id] = {};
		}
		room.playersInput[client.id][data.key] = data.state;
	}

	@SubscribeMessage("joinQueue")
	async handleJoinQueue(@ConnectedSocket() client: Socket): Promise<void> {
		//if the client.id is not in the queue, add him
		if (!this.queue.find((queueItem) => queueItem.socket === client)) {
			this.queue.push({
				socket: client,
				user: this.userSessions[client.id],
			});
			this.userStatusGateway.handleUpdateStatus(
				{ status: UserStatus.INQUEUE },
				client
			);
		}
		// console.log("current queue:", this.queue);

		// console.log("queue", this.queue.length, "id: ", client.id);

		if (this.queue.length >= 2) {
			const client1 = this.queue.shift();
			const client2 = this.queue.shift();

			const roomId = client1?.socket.id + "-" + client2?.socket.id;

			try {
				await client1?.socket.join(roomId);
				await client2?.socket.join(roomId);
			} catch (error) {
				console.error("Error joining room:", error);
				// Handle the error appropriately here, maybe by sending a message to the client
				return;
			}

			if (client1 && client2) {
				this.gameRooms[roomId] = {
					client1Id: client1.socket.id,
					client2Id: client2.socket.id,
					playersInput: {},
					gameState: {},
				};

				this.userStatusGateway.handleUpdateStatus(
					{ status: UserStatus.INGAME },
					client1.socket
				);
				this.userStatusGateway.handleUpdateStatus(
					{ status: UserStatus.INGAME },
					client2.socket
				);

				this.server.to(roomId).emit("matchFound", {
					roomId,
					player1: client1.user.username,
					player2: client2.user.username,
				});

				// Démarrer la salle de jeu
				this.startGameRoom(roomId);
			}
		}
	}

	@SubscribeMessage("cancelQueue")
	handleCancelQueue(@ConnectedSocket() client: Socket): void {
		const index = this.queue.findIndex(
			(queueItem) => queueItem.socket === client
		);
		if (index >= 0) {
			this.queue.splice(index, 1);
			this.userStatusGateway.handleUpdateStatus(
				{ status: UserStatus.ONLINE },
				client
			);
			// console.log("Client left queue", client.id);
		}
	}

	@SubscribeMessage("clientWantsToLeave")
	handleClientLeave(@ConnectedSocket() client: Socket): void {
		this.leaveGame(client);
	}

	@SubscribeMessage("joinTraining")
	async handleJoinTraining(@ConnectedSocket() client: Socket): Promise<void> {
		const roomId = "Training-" + client.id; // Créez un identifiant de salle unique
		await client.join(roomId); // Faites rejoindre le client à cette salle

		// Mettre à jour le statut de l'utilisateur pour indiquer qu'il est en mode "Training"
		this.userStatusGateway.handleUpdateStatus(
			{ status: UserStatus.INTRAINING },
			client
		);

		let username = "Guest";
		if (this.userSessions[client.id]) {
			username = this.userSessions[client.id].username;
		}
		const nameGenerator = () => {
			const names = [
				"Louis",
				"Tristan",
				"Croco",
				"Manon",
				"Alice",
				"Pierre",
				"Axel",
				"Fred",
				"Paul",
			];
			return names[Math.floor(Math.random() * names.length)];
		};
		const botName = "Bot " + nameGenerator();

		// Initialize the game room
		this.gameRooms[roomId] = {
			client1Id: client.id,
			client2Id: botName,
			playersInput: {},
			gameState: {},
		};

		this.server.to(roomId).emit("matchFound", {
			roomId,
			player1: username,
			player2: botName,
		});
		this.startTrainingGameRoom(roomId, client.id); // Démarrez la salle de jeu
	}

	initGameRoom(mode: "multiplayer" | "training") {
		const gameState = {
			player1: {
				...paddlePositions.player1,
				...paddleSize,
				collision: false,
			},
			player2: {
				...paddlePositions.player2,
				...paddleSize,
				collision: false,
			},
			ball: {
				...ballPosition,
				radius: ballSize.radius,
			},
			score: {
				...initialScore,
			},
			start: "VS",
			mode: mode,
			currentSpeed: 0,
			targetSpeed: 0,
			firstCollision: false,
			wallCollision: false,
		};
		return gameState;
	}

	startGameRoom(roomId: string) {
		const gameState = this.initGameRoom("multiplayer");
		const room = this.gameRooms[roomId];
		room.gameState = gameState;
		this.startCountdown(roomId, gameState).then(() => {
			if (this.gameRooms[roomId]) {
				this.startGameLoop(roomId);
			}
		});
	}
	startTrainingGameRoom(roomId: string, clientId: string) {
		const gameState = this.initGameRoom("training");
		const room = this.gameRooms[roomId];
		room.gameState = gameState;
		this.gameRooms[roomId].gameState = gameState;
		this.startCountdown(roomId, gameState).then(() => {
			if (this.gameRooms[roomId]) {
				this.startGameLoop(roomId);
			}
		});
	}

	smoothApproach(diff, deadZone) {
		if (Math.abs(diff) <= deadZone) {
			return 0;
		}

		const maxDiff = Math.max(gameSize.height / 2, deadZone);

		if (diff > deadZone) {
			return (diff - deadZone) / (maxDiff - deadZone);
		} else if (diff < -deadZone) {
			return (diff + deadZone) / (maxDiff - deadZone);
		}

		return 0;
	}
	moveBot(gameState) {
		const diffScore = gameState.score.player1 - gameState.score.player2;
		// inertia depending of the score
		const inertiaBase = 0.1;
		let inertiaFactor = inertiaBase + diffScore * 0.02;
		inertiaFactor = Math.min(Math.max(inertiaFactor, 0.03), 0.2);
		// This firstCollision was necessary to avoid the bot to miss the first ball
		if (!gameState.firstCollision) {
			inertiaFactor = 0.12;
			if (gameState.ball.x > gameState.player2.x - 50) {
				gameState.firstCollision = true;
			}
		}
		const targetY = gameState.ball.y;
		let diff =
			targetY - (gameState.player2.y + gameState.player2.height / 2);

		const deadZone = gameState.player2.height / 4;
		const smoothedDiff = this.smoothApproach(diff, deadZone);
		if (Math.abs(diff) < deadZone) {
			diff = 0;
		}

		gameState.targetSpeed = Math.sign(smoothedDiff) * paddleSpeed;

		gameState.currentSpeed =
			(1 - inertiaFactor) * gameState.currentSpeed +
			inertiaFactor * gameState.targetSpeed;

		gameState.player2.y += gameState.currentSpeed;

		if (gameState.player2.y < 0) {
			gameState.player2.y = 0;
		} else if (
			gameState.player2.y >
			gameSize.height - gameState.player2.height
		) {
			gameState.player2.y = gameSize.height - gameState.player2.height;
		}
	}
	movePaddle(roomId: string) {
		const room = this.gameRooms[roomId];
		if (!room) return;

		if (room.playersInput[room.client1Id]) {
			Object.keys(room.playersInput[room.client1Id]).forEach((input) => {
				if (
					input === "ArrowUp" &&
					room.playersInput[room.client1Id][input]
				) {
					room.gameState.player1.y -= 1 * paddleSpeed;
				} else if (
					input === "ArrowDown" &&
					room.playersInput[room.client1Id][input]
				) {
					room.gameState.player1.y += 1 * paddleSpeed;
				}
			});
		}
		if (room.gameState.mode === "multiplayer") {
			if (room.playersInput[room.client2Id]) {
				Object.keys(room.playersInput[room.client2Id]).forEach(
					(input) => {
						if (
							input === "ArrowUp" &&
							room.playersInput[room.client2Id][input]
						) {
							room.gameState.player2.y -= 1 * paddleSpeed;
						} else if (
							input === "ArrowDown" &&
							room.playersInput[room.client2Id][input]
						) {
							room.gameState.player2.y += 1 * paddleSpeed;
						}
					}
				);
			}
		} else if (room.gameState.mode === "training") {
			this.moveBot(room.gameState);
		}
		if (
			room.gameState.player1.y >
			gameSize.height -
				room.gameState.player1.height -
				room.gameState.ball.radius * 5
		) {
			room.gameState.player1.y =
				gameSize.height -
				room.gameState.player1.height -
				room.gameState.ball.radius * 5;
		}
		if (
			room.gameState.player2.y >
			gameSize.height -
				room.gameState.player2.height -
				room.gameState.ball.radius * 5
		) {
			room.gameState.player2.y =
				gameSize.height -
				room.gameState.player2.height -
				room.gameState.ball.radius * 5;
		}

		if (room.gameState.player1.y < room.gameState.ball.radius * 5) {
			room.gameState.player1.y = room.gameState.ball.radius * 5;
		}

		if (room.gameState.player2.y < room.gameState.ball.radius * 5) {
			room.gameState.player2.y = room.gameState.ball.radius * 5;
		}
	}

	startCountdown(roomId: string, gameState): Promise<void> {
		return new Promise((resolve) => {
			gameState.start = "VS";
			this.server.to(roomId).emit("gameState", gameState);

			this.gameRooms[roomId].movementInterval = setInterval(() => {
				this.movePaddle(roomId);
				this.server.to(roomId).emit("gameState", gameState);
			}, 16);

			setTimeout(() => {
				if (!this.gameRooms[roomId]) {
					// If the room has been deleted, just resolve the promise and exit
					resolve();
					return;
				}

				let countdown = 3;
				this.gameRooms[roomId].countdownInterval = setInterval(() => {
					gameState.start = countdown.toString();
					countdown--;

					if (countdown < 0) {
						if (this.gameRooms[roomId]?.countdownInterval) {
							clearInterval(
								this.gameRooms[roomId].countdownInterval!
							);
						}
						if (this.gameRooms[roomId]?.movementInterval) {
							clearInterval(
								this.gameRooms[roomId].movementInterval!
							);
						}
						gameState.start = "0";
						this.server.to(roomId).emit("gameState", gameState);
						resolve();
					}
				}, 1000);
			}, 2000);
		});
	}

	startGameLoop(roomId: string): void {
		const gameState = this.gameRooms[roomId].gameState;
		let internalState: InternalState = this.initializeGame();
		this.gameRooms[roomId].movementInterval = setInterval(() => {
			this.resetCollisionStates(gameState);
			this.movePaddle(roomId);
			if (
				this.handleRespawn(
					gameState,
					internalState,
					ballPosition,
					roomId
				)
			)
				return;

			this.handleWallCollisions(gameState, internalState);
			this.handlePaddleCollisions(gameState, internalState);

			if (
				SPEED_INCREASE_INTERVALS.includes(internalState.hitCount) &&
				(gameState.player1.collision || gameState.player2.collision)
			) {
				internalState.speed += 1.5;
			}

			this.updateBallPosition(gameState, internalState);

			if (this.isScoreReached(gameState)) {
				this.handleEndGame(roomId, gameState);
				return;
			}

			this.server.to(roomId).emit("gameState", gameState);
		}, FRAME_RATE);
	}

	initializeGame() {
		return {
			ballDirX: 1,
			ballDirY: 1.5,
			speed: ORIGINAL_SPEED,
			hitCount: 0,
			waitRespawn: -1,
		};
	}

	resetCollisionStates(gameState) {
		gameState.player1.collision = false;
		gameState.player2.collision = false;
		gameState.wallCollision = false;
	}

	handleRespawn(
		gameState,
		internalState: InternalState,
		ballPosition,
		roomId
	) {
		if (internalState.waitRespawn >= 0) {
			internalState.waitRespawn++;
			gameState.ball.x = gameSize.width + 10;
			if (internalState.waitRespawn === RESPAWN_COUNT) {
				internalState.waitRespawn = -1;
				gameState.ball.x = ballPosition.x;
			}
			this.server.to(roomId).emit("gameState", gameState);
			return true;
		}
		return false;
	}

	handleWallCollisions(gameState, internalState: InternalState) {
		if (
			gameState.ball.y < gameState.ball.radius ||
			gameState.ball.y > gameSize.height - gameState.ball.radius
		) {
			internalState.ballDirY *= -1;
			gameState.wallCollision = true;
		}
	}

	handlePaddleCollisions(gameState, internalState: InternalState) {
		// Checks and logic for player1 and player2 collisions
		// (similar to what you provided)
		const ballLeft = gameState.ball.x - gameState.ball.radius;
		const ballRight = gameState.ball.x + gameState.ball.radius;
		const ballTop = gameState.ball.y - gameState.ball.radius;
		const ballBottom = gameState.ball.y + gameState.ball.radius;

		const player1Right = gameState.player1.x + gameState.player1.width;
		const player1Bottom = gameState.player1.y + gameState.player1.height;

		const player2Left = gameState.player2.x;
		const player2Right = gameState.player2.x + gameState.player2.width;
		const player2Bottom = gameState.player2.y + gameState.player2.height;
		//collision detection with player1
		if (
			internalState.ballDirX < 0 &&
			ballLeft <= player1Right &&
			ballRight > gameState.player1.x &&
			ballBottom > gameState.player1.y &&
			ballTop < player1Bottom
		) {
			internalState.ballDirX *= -1;
			var deltaY =
				gameState.ball.y -
				(gameState.player1.y + gameState.player1.height / 2);
			internalState.ballDirY = deltaY / (gameState.player1.height / 2);
			internalState.ballDirY = Math.min(
				Math.max(internalState.ballDirY, -MAX_Y_SPEED),
				MAX_Y_SPEED
			);

			// Reset ball position to avoid sticking
			gameState.ball.x =
				gameState.player1.x +
				gameState.player1.width +
				gameState.ball.radius;
			gameState.player1.collision = true;
			internalState.hitCount++;
		}

		//collision detection with player2
		if (
			internalState.ballDirX > 0 &&
			ballRight >= player2Left &&
			ballLeft < player2Right &&
			ballBottom > gameState.player2.y &&
			ballTop < player2Bottom
		) {
			internalState.ballDirX *= -1;
			var deltaY =
				gameState.ball.y -
				(gameState.player2.y + gameState.player2.height / 2);
			internalState.ballDirY = deltaY / (gameState.player2.height / 2);
			internalState.ballDirY = Math.min(
				Math.max(internalState.ballDirY, -MAX_Y_SPEED),
				MAX_Y_SPEED
			);

			// Reset ball position to avoid sticking
			gameState.ball.x = gameState.player2.x - gameState.ball.radius;
			gameState.player2.collision = true;
			internalState.hitCount++;
		}
	}

	updateBallPosition(gameState, internalState: InternalState) {
		const angle = Math.atan2(
			internalState.ballDirY,
			internalState.ballDirX
		);
		const ballMovX = Math.cos(angle) * internalState.speed;
		const ballMovY = Math.sin(angle) * internalState.speed;

		if (gameState.ball.x < 0 || gameState.ball.x > gameSize.width) {
			this.handleScore(gameState, internalState);
			return;
		}

		gameState.ball.x += ballMovX;
		gameState.ball.y += ballMovY;
	}

	handleScore(gameState, internalState: InternalState) {
		const angle = Math.atan2(
			internalState.ballDirY,
			internalState.ballDirX
		);
		if (gameState.ball.x < 0 || gameState.ball.x > gameSize.width) {
			if (gameState.ball.x < 0) {
				gameState.score.player2 += 1;
			} else {
				gameState.score.player1 += 1;
			}
			internalState.ballDirX = Math.cos(angle);
			internalState.ballDirY = Math.sin(angle);
			internalState.speed = ORIGINAL_SPEED;
			internalState.hitCount = 0;
			internalState.waitRespawn = 0;
		}
	}

	isScoreReached(gameState) {
		return (
			gameState.score.player1 === MAX_SCORE ||
			gameState.score.player2 === MAX_SCORE
		);
	}

	handleEndGame(roomId, gameState) {
		const room = this.gameRooms[roomId];
		if (!room) return;
		clearInterval(this.gameRooms[roomId].movementInterval);
		const user1 = this.userSessions[room.client1Id];
		const user2 = this.userSessions[room.client2Id];
		const outcomePlayer1 = gameState.score.player1 === MAX_SCORE;
		const outcomePlayer2 = !outcomePlayer1;
		const finalScore = `${gameState.score.player1} - ${gameState.score.player2}`;
		const date = new Date();
		if (gameState.mode === "training") {
			this.server.to(roomId).emit("gameOver", gameState);
			const socket1 = this.server.sockets.sockets.get(room.client1Id);
			if (socket1) {
				this.handleGameOver(socket1);
			}
			return;
		}
		this.matchHistoryService
			.createMatch(user1, user2, outcomePlayer1, finalScore, date)
			.then((match) => {
				// console.log("Match saved:", match);
			})
			.catch((error) => {
				console.error("Error saving match:", error);
			});

		this.userStatsService.updateStatsAfterGame(user1.id, outcomePlayer1);
		this.userStatsService.updateStatsAfterGame(user2.id, outcomePlayer2);

		this.server.to(roomId).emit("gameOver", gameState);
		const socket1 = this.server.sockets.sockets.get(room.client1Id);
		if (socket1) {
			this.handleGameOver(socket1);
		}
	}
}
