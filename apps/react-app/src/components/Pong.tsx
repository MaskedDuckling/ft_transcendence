import React, { useEffect, useState, useRef } from "react";
import createPongSocket from "../pongSocket";
import PongGame, { GameState } from "./PongGame";
import { useContext } from "react";
import { GameContext } from "../pages/App";
import { PongLoading, PongLoadingInvitation } from "./PongLoading";
import styles from "../assets/styles/Pong.module.css";
import PongHome from "./PongHome";
import { sound } from "@pixi/sound";

import winSound from "../assets/sounds/win.mp3";
import loseSound from "../assets/sounds/lose.mp3";
import matchmakingSound from "../assets/sounds/matchmaking.mp3";
import foundSound from "../assets/sounds/found.mp3";
import { is } from "css-select";

function Pong() {
	const socket = createPongSocket();
	const [message, setMessage] = useState("");
	const [messages, setMessages] = useState<string[]>([]);
	const [matchFound, setMatchFound] = useState(false);
	const [gameState, setGameState] = useState<GameState | null>(null);
	const [isGameOver, setIsGameOver] = useState(false);
	const [playerOneWon, setPlayerOneWon] = useState(false);
	const [playerTwoWon, setPlayerTwoWon] = useState(false);
	const [inQueue, setInQueue] = useState(false);
	const [opponentDc, setOpponentDc] = useState(false);
	const [highLatency, setHighLatency] = useState(false);
	const [PlayerOneUsername, setPlayerOneUsername] = useState<string>("");
	const [PlayerTwoUsername, setPlayerTwoUsername] = useState<string>("");
	const isInGame = useContext(GameContext).isInGame;
	const { setIsInGame } = useContext(GameContext);
	const [gameMode, setGameMode] = useState<"online" | "training" | null>(
		null
	);
	const myUsername = useContext(GameContext).username;
	const [isInvitation, setIsInvitation] = useState(false);
	const [gameInvitationSent, setGameInvitationSent] = [
		useContext(GameContext).gameInvitationSent,
		useContext(GameContext).setGameInvitationSent,
	];
	const [areSoundsLoaded, setAreSoundsLoaded] = useState(false);
	const areSoundsLoadedRef = useRef(areSoundsLoaded);

	useEffect(() => {
		setTimeout(() => {
			areSoundsLoadedRef.current = areSoundsLoaded;
		}, 200);
	}, [areSoundsLoaded]);
	const tryToPlaySound = (soundName: string) => {
		if (areSoundsLoadedRef.current) {
			sound.play(soundName);
		} else {
			console.warn(`Sound ${soundName} is not loaded yet. Cannot play.`);
		}
	};

	useEffect(() => {
		console.log("Adding sounds...");
		Promise.all([
			sound.add("win", { url: winSound, preload: true }),
			sound.add("lose", { url: loseSound, preload: true }),
			sound.add("matchmaking", {
				url: matchmakingSound,
				preload: true,
				loop: true,
			}),
			sound.add("found", { url: foundSound, preload: true }),
		]).then(() => {
			setAreSoundsLoaded(true);
		});
		return () => {
			console.log("Removing sounds...");
			sound.remove("win");
			sound.remove("lose");
			sound.remove("matchmaking");
			sound.remove("found");
			setIsInvitation(false);
			handleCancelInvitation();
			setIsInGame(false);
			setHighLatency(false);
		};
	}, []);

	useEffect(() => {
		if (gameInvitationSent !== "") {
			console.log("Invitation detected...");
			setIsInvitation(true);
			if (isGameOver) {
				setMatchFound(false);
				setIsGameOver(false);
			} else if (matchFound) {
				setIsInvitation(false);
				setGameInvitationSent("");
			}
		} else {
			setIsInvitation(false);
		}
	}, [gameInvitationSent, matchFound]);
	useEffect(() => {
		if (isInvitation) {
			try {
				console.log("Trying to play sound...");
				if (sound.exists("matchmaking")) {
					console.log("Sound exists, stopping...");
					sound.stop("matchmaking");
				}
				setTimeout(() => {
					console.log("Playing sound...");
					// sound.play("matchmaking");
					tryToPlaySound("matchmaking");
				}, 500);
			} catch (error) {
				console.error("Erreur lors de la lecture du son :", error);
			}
		} else {
			console.log("Stopping sound...");
			sound.stop("matchmaking");
		}
	}, [isInvitation]);

	useEffect(() => {
		const onBlur = () => {};

		const onFocus = () => {
			console.log("FOCUS");
			sound.stopAll();
		};

		window.addEventListener("blur", onBlur);
		window.addEventListener("focus", onFocus);

		return () => {
			window.removeEventListener("blur", onBlur);
			window.removeEventListener("focus", onFocus);
		};
	}, []);
	const gameOverSound = (won: boolean, amIPlayer1: boolean) => {
		console.log(
			"GAME OVER SOUND, WON: ",
			won,
			" AM I PLAYER 1: ",
			amIPlayer1
		);
		if (opponentDc) {
			// sound.play("win");
			tryToPlaySound("win");
			return;
		}
		if (amIPlayer1) {
			if (won) {
				// sound.play("win");
				tryToPlaySound("win");
			} else {
				// sound.play("lose");
				tryToPlaySound("lose");
			}
		} else {
			if (won) {
				// sound.play("lose");
				tryToPlaySound("lose");
			} else {
				// sound.play("win");
				tryToPlaySound("win");
			}
		}
	};
	useEffect(() => {
		if (isGameOver) {
			console.log(
				"GAME OVER SOUND",
				playerOneWon,
				myUsername,
				PlayerOneUsername
			);
			gameOverSound(
				playerOneWon,
				PlayerOneUsername === myUsername ? true : false
			);
		}
	}, [isGameOver]);
	const keydownHandler = (e: KeyboardEvent) => {
		if (e.code === "ArrowUp" || e.code === "ArrowDown") {
			socket.emit("keyPress", { key: e.code, state: true });
		}
	};
	const keyupHandler = (e: KeyboardEvent) => {
		if (e.code === "ArrowUp" || e.code === "ArrowDown") {
			socket.emit("keyPress", { key: e.code, state: false });
		}
	};

	useEffect(() => {
		window.addEventListener("keydown", keydownHandler);
		window.addEventListener("keyup", keyupHandler);

		return () => {
			window.removeEventListener("keydown", keydownHandler);
			window.removeEventListener("keyup", keyupHandler);
		};
	}, []);

	useEffect(() => {
		console.log("CANCEL QUEUE");
		return () => {
			socket.emit("cancelQueue");
		};
	}, []);

	useEffect(() => {
		socket.on("connect", function () {
			console.log("client connected!!");
		});
		socket.on("message", (data) => {
			setMessages((msgs) => [...msgs, data]);
		});

		socket.on("matchFound", (data) => {
			console.log("Match found!", data);
			setPlayerOneUsername(data.player1);
			setPlayerTwoUsername(data.player2);
			setMatchFound(true);
			setIsGameOver(false);
			setInQueue(false);
			if (sound.exists("matchmaking")) {
				sound.stop("matchmaking");
			}
			// sound.play("found");
			tryToPlaySound("found");
			setIsInGame(true);
			setHighLatency(false);
			// setGameState(data); // set initial game state when a match is found
		});

		socket.on("gameOver", (data) => {
			setGameState(data);
			console.log(
				" data.player1 === myUsername",
				data.player1,
				myUsername
			);
			if (data.score.player1 === 11) {
				setPlayerOneWon(true);
			} else {
				setPlayerTwoWon(true);
			}
			setIsGameOver(true);
			setIsInGame(false);
		});

		socket.on("gameState", (data) => {
			setGameState(data); // update game state every time server sends it
		});

		socket.on("opponentLeft", (data) => {
			if (isGameOver) {
				return;
			} else {
				setOpponentDc(true);
				setIsGameOver(true);
				setIsInGame(false);
			}
		});

		socket.on("highLatency", (data) => {
			// show popup
			setHighLatency(true);
			// if (isInGameRef.current) {
			// 	showPopup(
			// 		"High latency detected. Please check your internet connection."
			// 	);
			// }
		});
		return () => {
			socket.emit("cancelQueue");
		};
	}, []);

	const handleJoinQueue = () => {
		console.log("Joining queue with id", socket.id);
		setGameMode("online");
		socket.emit("joinQueue");
		setInQueue(true);
		// sound.play("matchmaking");
		tryToPlaySound("matchmaking");
	};

	const handleTraining = () => {
		setGameMode("training");
		setInQueue(true);
		socket.emit("joinTraining");
		// sound.play("matchmaking");
		tryToPlaySound("matchmaking");
	};

	const handleReplay = () => {
		// socket.disconnect();
		// socket.connect();
		setGameState(null);
		setMatchFound(false);
		setOpponentDc(false);
		setIsGameOver(false);
		setPlayerOneWon(false);
		setPlayerTwoWon(false);
		if (gameMode === "training") {
			handleTraining();
		} else if (gameMode === "online") {
			handleJoinQueue();
		}
	};

	const handleHome = () => {
		socket.emit("cancelQueue");
		setGameState(null);
		setMatchFound(false);
		setOpponentDc(false);
		setIsGameOver(false);
		setPlayerOneWon(false);
		setPlayerTwoWon(false);
		setInQueue(false);
		setGameMode(null);
	};

	const handleCancel = () => {
		socket.emit("cancelQueue"); // informer le serveur que l'utilisateur souhaite annuler la file d'attente
		setInQueue(false); // indiquer que l'utilisateur n'est plus en file d'attente
		sound.stop("matchmaking");
	};

	const handleCancelInvitation = () => {
		socket.emit("cancelCurrentGameInvitation");
		setIsInvitation(false);
	};

	return (
		<div id="pong" className={styles.pong}>
			{/* <ul>
				{messages.map((msg, index) => (
					<li key={index}>{msg}</li>
				))}
			</ul> */}
			{isInvitation && !matchFound ? (
				<PongLoadingInvitation
					handleCancelInvitation={handleCancelInvitation}
					username={gameInvitationSent}
				/>
			) : (
				<>
					{!matchFound && (
						<div className={styles.pongQueue}>
							{!matchFound && !inQueue && (
								<PongHome
									handleJoinQueue={handleJoinQueue}
									handleTraining={handleTraining}
								/>
							)}
							{!matchFound && inQueue && (
								<PongLoading handleCancel={handleCancel} />
							)}
						</div>
					)}

					{matchFound && gameState && (
						<>
							{isGameOver ? (
								<div className={styles.handleReplay}>
									<h1 className={styles.gameover}>
										Game is over
									</h1>
									{opponentDc ? (
										<h2 className={styles.result}>
											Your opponent has left the game !
											You win !
										</h2>
									) : playerOneWon ? (
										<h2 className={styles.result}>
											{PlayerOneUsername} has won the
											game!
										</h2>
									) : (
										<h2 className={styles.result}>
											{PlayerTwoUsername} has won the
											game!
										</h2>
									)}
									<div className={styles.replayButtons}>
										<button
											className={styles.handleReplayBtn}
											onClick={handleReplay}
										>
											Restart
										</button>
										<button
											className={styles.handleReplayBtn}
											onClick={handleHome}
										>
											Home
										</button>
									</div>
								</div>
							) : (
								<div className={styles.pongContainer}>
									<div id="pongContainer">
										{highLatency && (
											<div className={styles.highLatency}>
												<h1>High latency detected.</h1>
												<h2>
													Please check your internet
													connection.
												</h2>
											</div>
										)}
										<PongGame
											gameState={gameState}
											player1Name={PlayerOneUsername}
											player2Name={PlayerTwoUsername}
										/>
									</div>
								</div>
							)}
						</>
					)}
				</>
			)}
		</div>
	);
}

export default Pong;
