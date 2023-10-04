import React, { useEffect, useRef } from "react";
import styles from "../assets/styles/Pong.module.css";
import * as PIXI from "pixi.js";

const PongBackground = () => {
	const ref = useRef<HTMLDivElement>(null);
	const app = useRef<PIXI.Application | null>(null);

	useEffect(() => {
		if (ref.current) {
			const appInstance = new PIXI.Application({
				width: ref.current.clientWidth,
				height: ref.current.clientHeight,
				backgroundColor: 0x1099bb,
				backgroundAlpha: 0,
			});

			ref.current.appendChild(appInstance.view as unknown as Node);

			// Dessiner les palettes
			const leftPaddle = new PIXI.Graphics();
			const rightPaddle = new PIXI.Graphics();
			leftPaddle.beginFill(0xffffff);
			rightPaddle.beginFill(0xffffff);
			leftPaddle.drawRect(0, 0, 10, 60);
			rightPaddle.drawRect(0, 0, 10, 60);

			// Positionner les palettes
			leftPaddle.x = 20;
			leftPaddle.y = appInstance.renderer.height / 2 - 30;
			rightPaddle.x = appInstance.renderer.width - 30;
			rightPaddle.y = appInstance.renderer.height / 2 - 30;

			appInstance.stage.addChild(leftPaddle, rightPaddle);

			// Dessiner la balle
			const ball = new PIXI.Graphics();
			ball.beginFill(0xffffff);
			ball.drawRect(0, 0, 10, 10);
			ball.x = appInstance.renderer.width / 2;
			ball.y = appInstance.renderer.height / 2;

			appInstance.stage.addChild(ball);

			// Définir les vitesses
			let ballSpeedX = 2;
			let ballSpeedY = 1;
			let paddleSpeed = 3;

			let time = 0;

			appInstance.ticker.add(() => {
				ball.x += ballSpeedX;
				ball.y += ballSpeedY;
				time += 0.06;

				const leftPaddleOscillation = Math.sin(time) * 50;
				const rightPaddleOscillation = Math.sin(time + 3) * 50;

				const movePaddle = (
					paddle: PIXI.Graphics,
					targetY: number,
					oscillation: number
				) => {
					const targetSpeed = paddleSpeed;
					const desiredPosition = targetY + oscillation;
					if (
						desiredPosition < paddle.y + 30 &&
						paddle.y - targetSpeed > 0
					) {
						paddle.y -= targetSpeed;
					} else if (
						desiredPosition > paddle.y + 30 &&
						paddle.y + targetSpeed <
							appInstance.renderer.height - 60
					) {
						paddle.y += targetSpeed;
					}
				};

				movePaddle(leftPaddle, ball.y, leftPaddleOscillation);
				movePaddle(rightPaddle, ball.y, rightPaddleOscillation);

				// Inverser les vitesses pour créer l'illusion de rebond
				if (ball.y <= 0 || ball.y >= appInstance.renderer.height - 10) {
					ballSpeedY *= -1;
				}

				// Vérifier la collision avec les palettes
				if (
					(ball.x <= leftPaddle.x + 10 &&
						ball.y >= leftPaddle.y &&
						ball.y <= leftPaddle.y + 60) ||
					(ball.x >= rightPaddle.x - 10 &&
						ball.y >= rightPaddle.y &&
						ball.y <= rightPaddle.y + 60)
				) {
					ballSpeedX *= -1;
				}

				// Réinitialiser la balle si elle atteint un des bords droits ou gauches
				if (ball.x <= 0 || ball.x >= appInstance.renderer.width) {
					ball.x = appInstance.renderer.width / 2;
					ball.y = appInstance.renderer.height / 2;
					ballSpeedX = 3;
					ballSpeedY = 2;
				}
			});

			return () => {
				appInstance.destroy(true);
			};
		}
	}, []);
	useEffect(() => {
		const resizeGame = () => {
			const parentElement = document.getElementById("home");
			const pongElement = document.getElementById("homeContainer");
			if (!parentElement || !pongElement) {
				console.error("No parent element found");
				return;
			}
			const canvasElement = pongElement.querySelector("canvas");
			if (canvasElement) {
				canvasElement.style.width = parentElement.clientWidth + "px";
				canvasElement.style.height = parentElement.clientHeight + "px";
			}
		};

		const parentElement = document.getElementById("home");

		if (parentElement) {
			const resizeObserver = new ResizeObserver(resizeGame);
			resizeObserver.observe(parentElement);
			resizeGame();

			return () => {
				resizeObserver.disconnect();
			};
		}
	}, [app.current]);

	return (
		<div
			ref={ref}
			id="homeBackground"
			className={styles.homeBackground}
		></div>
	);
};

const PongHome = ({ handleJoinQueue, handleTraining }: any) => {
	return (
		<div id="home" className={styles.home}>
			<div id="homeContainer" className={styles.homeContainer}>
				<div
					className={styles.homeContent}
					style={{ position: "relative" }}
				>
					<h1 className={styles.homeTitle}>Welcome to Pong!</h1>
					<div className={styles.homeButtons}>
						<button
							className={styles.homeButton}
							onClick={handleJoinQueue}
						>
							Play
						</button>
						<button
							className={styles.homeButton}
							onClick={handleTraining}
						>
							Training
						</button>
					</div>
				</div>
				<PongBackground />
			</div>
		</div>
	);
};

export default PongHome;
