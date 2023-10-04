import React, { useEffect, useMemo, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { sound } from "@pixi/sound";
import { GlowFilter } from "@pixi/filter-glow";
import styles from "../assets/styles/Pong.module.css";
import { Trail } from "react-spring";
import { GameContext } from "../pages/App";
import { useContext } from "react";

import paddleSound from "../assets/sounds/paddle.mp3";
import wallSound from "../assets/sounds/wall.mp3";
import scorePlusSound from "../assets/sounds/scorePlus.wav";
import scoreMinusSound from "../assets/sounds/scoreMinus.wav";
import tickingSound from "../assets/sounds/ticking.mp3";
import startSound from "../assets/sounds/start.mp3";

type GameState = {
	ball: { x: number; y: number; radius: number };
	player1: {
		x: number;
		y: number;
		width: number;
		height: number;
		collision: boolean;
	};
	player2: {
		x: number;
		y: number;
		width: number;
		height: number;
		collision: boolean;
	};
	score: { player1: number; player2: number };
	start: string;
	wallCollision: boolean;
};

const glowFilterPlayer = new GlowFilter({
	color: 0xffffff,
	distance: 10,
	outerStrength: 1.5,
	innerStrength: 1.5,
});
const glowFilterBall = new GlowFilter({
	color: 0xffffff,
	distance: 20,
	outerStrength: 1.5,
	innerStrength: 1.5,
});
const glowFilterBallHit = new GlowFilter({
	color: 0xffffff,
	distance: 20,
	outerStrength: 1.5,
	innerStrength: 1.5,
});

const glowFilterHit = new GlowFilter({
	color: 0xffffff,
	distance: 20,
	outerStrength: 3,
	innerStrength: 3,
});

const glowFilterParticle = new GlowFilter({
	color: 0xffffff,
	distance: 20,
	outerStrength: 2.5,
	innerStrength: 2.5,
});

const glowFilterText = new GlowFilter({
	color: 0xffffff,
	distance: 15,
	outerStrength: 1.2,
	innerStrength: 1.2,
});

type ScoreScale = {
	player1: number;
	player2: number;
};

type PongGameProps = {
	gameState: GameState;
	player1Name: string;
	player2Name: string;
};

const playSound = (key: string, options?: any) => {
	sound.stop(key);
	try {
		sound.play(key, options);
	} catch (e) {
		console.log(e);
	}
};

const PongGame: React.FC<PongGameProps> = ({
	gameState,
	player1Name,
	player2Name,
}) => {
	const myUsername = useContext(GameContext).username;
	const amIPlayer1 = myUsername === player1Name;
	const PONG_WIDTH = 800;
	const PONG_HEIGHT = 600;
	const SCORE_PLAYER1_X = 100;
	const SCORE_PLAYER2_X = PONG_WIDTH - 100;
	const SCORE_Y = 50;
	const [tickAlreadyPlayed, setTickAlreadyPlayed] = useState("");
	useEffect(() => {
		sound.add("hit2", { url: paddleSound, preload: true });
		sound.add("hit3", { url: wallSound, preload: true });
		sound.add("scorePlus", { url: scorePlusSound, preload: true });
		sound.add("scoreMinus", { url: scoreMinusSound, preload: true });
		sound.add("ticking", { url: tickingSound, preload: true });
		sound.add("start", { url: startSound, preload: true });
		return () => {
			sound.remove("hit2");
			sound.remove("hit3");
			sound.remove("scorePlus");
			sound.remove("scoreMinus");
			sound.remove("ticking");
			sound.remove("start");
		};
	}, []);
	useEffect(() => {
		const onBlur = () => {};

		const onFocus = () => {
			sound.stopAll();
		};

		window.addEventListener("blur", onBlur);
		window.addEventListener("focus", onFocus);

		return () => {
			window.removeEventListener("blur", onBlur);
			window.removeEventListener("focus", onFocus);
		};
	}, []);

	const gameContainer = useRef<HTMLDivElement>(null);
	const app = useRef<PIXI.Application | null>(null);
	const [countdownText, setCountdownText] = useState(
		new PIXI.Text("VS", {
			fontFamily: "clacon2",
			fontSize: 70,
			fill: "white",
		})
	);
	const [playerNameText, setPlayerNameText] = useState(
		new PIXI.Text(player1Name, {
			fontFamily: "clacon2",
			fontSize: 40,
			fill: "white",
		})
	);
	playerNameText.anchor.set(0, 0.5);
	const [playerNameText2, setPlayerNameText2] = useState(
		new PIXI.Text(player2Name, {
			fontFamily: "clacon2",
			fontSize: 40,
			fill: "white",
		})
	);
	playerNameText2.anchor.set(1, 0.5);
	player1Name = player1Name.toUpperCase();
	player2Name = player2Name.toUpperCase();
	const player1 = useMemo(() => new PIXI.Graphics(), []);
	const player2 = useMemo(() => new PIXI.Graphics(), []);
	const ball = useMemo(() => new PIXI.Graphics(), []);
	const ballTrail = useRef<PIXI.Graphics[]>([]);
	const ballPosition = useRef<number[][]>([]);
	const scoreScale = useRef<ScoreScale>({ player1: 1, player2: 1 });
	const previousScores = useRef({
		player1: gameState.score.player1,
		player2: gameState.score.player2,
	});
	const scorePlayer1 = useMemo(
		() =>
			new PIXI.Text("0", {
				fill: "#ffffff",
				fontSize: 40,
				fontFamily: "clacon2",
			}),
		[]
	);
	const scorePlayer2 = useMemo(
		() =>
			new PIXI.Text("0", {
				fill: "#ffffff",
				fontSize: 40,
				fontFamily: "clacon2",
			}),
		[]
	);
	scorePlayer1.anchor.set(0.5);
	scorePlayer2.anchor.set(0.5);

	const particlesContainer = useMemo(() => new PIXI.Container(), []);

	const particles = useRef<
		{
			sprite: PIXI.Sprite;
			velocity: { x: number; y: number };
			lifetime: number;
			radius: number;
		}[]
	>([]);
	const createCollisionParticles = (
		x: number,
		y: number,
		direction: "left" | "right"
	) => {
		const numberOfParticles = 10;

		for (let i = 0; i < numberOfParticles; i++) {
			const particle = PIXI.Sprite.from(PIXI.Texture.WHITE);
			particle.x = x;
			particle.y = y;
			particle.width = particle.height = 4;
			particle.tint = 0xffffff;
			particle.alpha = 1;

			const velocity = {
				x: (Math.random() - 0.5) * 5,
				y: (Math.random() - 0.5) * 5,
			};
			if (direction === "right") {
				velocity.x = -Math.abs(velocity.x);
			} else {
				velocity.x = Math.abs(velocity.x);
			}
			particles.current.push({
				sprite: particle,
				velocity,
				lifetime: 1,
				radius: 4,
			});
			particlesContainer.addChild(particle);
		}
	};

	const createScoreParticles = (x: number, y: number) => {
		const numberOfParticles = 10;
		const spread = Math.PI / 3;

		const lastBallPosition =
			ballPosition.current[ballPosition.current.length - 1];
		const secondLastBallPosition =
			ballPosition.current.length > 1
				? ballPosition.current[ballPosition.current.length - 2]
				: lastBallPosition;

		// Calculer l'angle entre les deux dernières positions de la balle
		const angleBetweenLastPoints = Math.atan2(
			lastBallPosition[1] - secondLastBallPosition[1],
			lastBallPosition[0] - secondLastBallPosition[0]
		);

		// Ajouter π pour pointer dans la direction opposée
		const oppositeAngle = angleBetweenLastPoints + Math.PI;

		for (let i = 0; i < numberOfParticles; i++) {
			const particle = PIXI.Sprite.from(PIXI.Texture.WHITE);
			particle.x = x;
			particle.y = y;
			particle.width = particle.height = 4;
			particle.tint = 0xffffff;
			particle.alpha = 1;

			// Calculer un angle aléatoire dans la plage de dispersion
			const randomAngle = (Math.random() - 0.5) * spread + oppositeAngle;

			const velocity = {
				x: Math.cos(randomAngle) * 5,
				y: Math.sin(randomAngle) * 5,
			};

			particles.current.push({
				sprite: particle,
				velocity,
				lifetime: 10,
				radius: 4,
			});
			particlesContainer.addChild(particle);
		}
	};

	useEffect(() => {
		app.current = new PIXI.Application({
			width: PONG_WIDTH,
			height: PONG_HEIGHT,
			backgroundColor: 0x000000,
		});

		countdownText.anchor.set(0.5); // pour centrer le texte
		countdownText.x = PONG_WIDTH / 2;
		countdownText.y = PONG_HEIGHT / 2;

		app.current.stage.addChild(countdownText);

		gameContainer.current?.appendChild(app.current.view as unknown as Node);
		player1.filters = [glowFilterPlayer];
		player2.filters = [glowFilterPlayer];
		ball.filters = [glowFilterBall];
		scorePlayer1.filters = [glowFilterText];
		scorePlayer2.filters = [glowFilterText];
		playerNameText.filters = [glowFilterText];
		playerNameText2.filters = [glowFilterText];
		countdownText.filters = [glowFilterText];
		particlesContainer.filters = [glowFilterParticle];
		app.current.stage.addChild(
			player1,
			player2,
			ball,
			scorePlayer1,
			scorePlayer2,
			particlesContainer
		);
		scorePlayer1.x = SCORE_PLAYER1_X + scorePlayer1.width / 2;
		scorePlayer1.y = SCORE_Y + scorePlayer1.height / 2;

		scorePlayer2.x = SCORE_PLAYER2_X + scorePlayer2.width / 2;
		scorePlayer2.y = SCORE_Y + scorePlayer2.height / 2;

		return () => {
			app.current?.destroy(true);
		};
	}, []);

	const updateParticles = () => {
		const gravity = 0.2; // accélération constante vers le bas

		particles.current.forEach((particle, index) => {
			// Ajout de la gravité
			particle.velocity.y += gravity;

			particle.sprite.x += particle.velocity.x;
			particle.sprite.y += particle.velocity.y;

			// Réduction de l'alpha pour créer un effet de fade
			particle.sprite.alpha -= 0.01;
			if (particle.sprite.alpha <= 0) {
				particlesContainer.removeChild(particle.sprite);
				particle.sprite.destroy();
				particles.current.splice(index, 1);
			}
		});
	};

	const drawTrail = () => {
		for (let i = 0; i < ballTrail.current.length; i++) {
			const trailSquare = ballTrail.current[i];
			const alpha = (i / 5 + 1) / ballTrail.current.length;
			const radius =
				((i + 1) / ballTrail.current.length) * gameState.ball.radius;
			const [x, y] = ballPosition.current[i];
			trailSquare
				.clear()
				.beginFill(0xffffff, alpha)
				.drawRect(x - radius, y - radius, radius * 2, radius * 2);
		}
	};

	const drawPlayersAndBall = () => {
		player1
			.clear()
			.beginFill(0xffffff)
			.drawRect(
				gameState.player1.x,
				gameState.player1.y,
				gameState.player1.width,
				gameState.player1.height
			);
		player2
			.clear()
			.beginFill(0xffffff)
			.drawRect(
				gameState.player2.x,
				gameState.player2.y,
				gameState.player2.width,
				gameState.player2.height
			);
		ball.clear()
			.beginFill(0xffffff)
			.drawRect(
				gameState.ball.x - gameState.ball.radius,
				gameState.ball.y - gameState.ball.radius,
				gameState.ball.radius * 2,
				gameState.ball.radius * 2
			);
	};

	const updateScore = () => {
		const lastBallPosition =
			ballPosition.current[ballPosition.current.length - 1];
		scorePlayer1.text = gameState.score.player1.toString();
		scorePlayer2.text = gameState.score.player2.toString();
		if (
			previousScores.current.player1 !== gameState.score.player1 ||
			previousScores.current.player2 !== gameState.score.player2
		) {
			ball.filters = [glowFilterBall];
			glowFilterBallHit.outerStrength = glowFilterBall.outerStrength;
			glowFilterBallHit.innerStrength = glowFilterBall.innerStrength;
		}
		if (previousScores.current.player1 !== gameState.score.player1) {
			createScoreParticles(lastBallPosition[0], lastBallPosition[1]);
			previousScores.current.player1 = gameState.score.player1;
			scoreScale.current.player1 = 2;
			playSound(amIPlayer1 ? "scorePlus" : "scoreMinus", { volume: 0.6 });
		}
		if (previousScores.current.player2 !== gameState.score.player2) {
			createScoreParticles(lastBallPosition[0], lastBallPosition[1]);
			previousScores.current.player2 = gameState.score.player2;
			scoreScale.current.player2 = 2;
			playSound(!amIPlayer1 ? "scorePlus" : "scoreMinus", {
				volume: 0.6,
			});
		}
	};
	useEffect(() => {
		const animateScore = () => {
			["player1", "player2"].forEach((player) => {
				const scoreText =
					player === "player1" ? scorePlayer1 : scorePlayer2;
				const scale = scoreScale.current[player as keyof ScoreScale];

				scoreText.scale.set(scale, scale);
				scoreScale.current[player as keyof ScoreScale] = Math.max(
					1,
					scale - 0.03
				);
			});

			requestAnimationFrame(animateScore);
		};
		animateScore();
	}, []);

	useEffect(() => {
		const resizeGame = () => {
			const parentElement = document.getElementById("pong");
			const pongElement = document.getElementById("pongContainer");
			if (!parentElement || !pongElement) {
				return;
			}
			const canvasElement = pongElement.querySelector("canvas");
			if (!canvasElement) {
				return;
			}
			const otherHeight =
				pongElement.clientHeight - canvasElement.clientHeight;
			const availableHeight = parentElement.clientHeight - otherHeight;

			//set the canvas max height to the available height
			canvasElement.style.maxHeight = `${availableHeight}px`;
		};

		const parentElement = document.getElementById("pong");

		if (parentElement) {
			const resizeObserver = new ResizeObserver(resizeGame);
			resizeObserver.observe(parentElement);
			resizeGame();

			return () => {
				resizeObserver.disconnect();
			};
		}
	}, [app.current]);

	useEffect(() => {
		if (gameState && app.current && player1 && player2 && ball) {
			const {
				ball: ballState,
				player1: player1State,
				player2: player2State,
			} = gameState;

			updateScore();
			// Update ball trail
			const newTrailSquare = new PIXI.Graphics();
			newTrailSquare
				.beginFill(0xffffff)
				.drawRect(
					ballState.x,
					ballState.y,
					ballState.radius * 2,
					ballState.radius * 2
				);
			ballTrail.current.push(newTrailSquare);
			ballPosition.current.push([ballState.x, ballState.y]);
			if (ballTrail.current.length > 70) {
				ballTrail.current.shift()?.destroy();
				ballPosition.current.shift();
			}

			// Update particles
			updateParticles();
			if (gameState.wallCollision) {
				playSound("hit2", { volume: 1, speed: 1, start: 0 });
			}
			if (player1State.collision || player2State.collision) {
				playSound("hit3", { volume: 1, speed: 1, start: 0 });
				if (player1State.collision) {
					createCollisionParticles(
						player1State.x,
						player1State.y,
						"left"
					);
					player1.filters = [glowFilterHit];
					setTimeout(() => {
						player1.filters = [glowFilterPlayer];
					}, 100);
				} else {
					createCollisionParticles(
						player2State.x,
						player2State.y,
						"right"
					);
					player2.filters = [glowFilterHit];
					setTimeout(() => {
						player2.filters = [glowFilterPlayer];
					}, 100);
				}
				ball.filters = [glowFilterBallHit];
				if (glowFilterBallHit.outerStrength < 10)
					glowFilterBallHit.outerStrength += 0.5;
			}

			if (gameState.start !== "0") {
				countdownText.text = gameState.start;
				if (
					gameState.start === "1" ||
					gameState.start === "2" ||
					gameState.start === "3"
				) {
					if (gameState.start !== tickAlreadyPlayed) {
						playSound("ticking", { volume: 0.6 });
						setTickAlreadyPlayed(gameState.start);
					}
				}

				const smoothing = 0.2;
				const targetPosition1 = {
					x: gameState.player1.x + gameState.player1.width / 2 + 20,
					y: gameState.player1.y + gameState.player1.height / 2,
				};
				const targetPosition2 = {
					x: gameState.player2.x - gameState.player2.width / 2 - 20,
					y: gameState.player2.y + gameState.player2.height / 2,
				};

				playerNameText.x +=
					(targetPosition1.x - playerNameText.x) * smoothing;
				playerNameText.y +=
					(targetPosition1.y - playerNameText.y) * smoothing;
				playerNameText2.x +=
					(targetPosition2.x - playerNameText2.x) * smoothing;
				playerNameText2.y +=
					(targetPosition2.y - playerNameText2.y) * smoothing;

				app.current.stage.addChild(playerNameText);
				app.current.stage.addChild(playerNameText2);

				ball.alpha = 0;
				ballTrail.current.forEach((trail) => {
					trail.alpha = 0;
				});
			} else {
				app.current.stage.removeChild(countdownText);
				app.current.stage.removeChild(playerNameText);
				app.current.stage.removeChild(playerNameText2);
				ball.alpha = 1;
				ballTrail.current.forEach((trail) => {
					trail.alpha = 1;
				});
			}
			app.current.stage.addChild(...ballTrail.current);
			drawTrail();
			drawPlayersAndBall();
			app.current.render();
			if (
				gameState.start === "0" &&
				gameState.start !== tickAlreadyPlayed
			) {
				playSound("start", { volume: 0.6 });
				setTickAlreadyPlayed(gameState.start);
			}
		}
	}, [
		gameState,
		app.current,
		player1,
		player2,
		ball,
		ballTrail.current,
		particlesContainer,
	]);

	return <div className={styles.canvasContainer} ref={gameContainer} />;
};

export default PongGame;
export type { GameState };
