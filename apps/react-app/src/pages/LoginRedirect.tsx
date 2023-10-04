import React, { useEffect, useState, useRef, useContext } from "react";
import styles from "../assets/styles/LoginRedirect.module.css";
// import logo from '../assets/images/2042.png';
import logo from "../assets/images/2042moshed.mp4";
import TwoFAVerif from "./TwoFAVerif";
import { Navigate } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import fetchProtect from "../services/fetchProtect";

import floppy_read from "../assets/sounds/floppy_read.mp3";
import introSound from "../assets/sounds/intro.mp3";
import { bool } from "sharp";

function LoginRedirect() {
	const [responseData, setResponseData] = useState(null) as any;
	const [isRequestSent, setIsRequestSent] = useState(false);
	const [requestFullscreen, setRequestFullscreen] = useState(false);
	const [terminalLines, setTerminalLines] = useState<string[]>([]);
	const [startTerminalAnimation, setStartTerminalAnimation] = useState(false);
	const [linesDisplayed, setLinesDisplayed] = useState(0);
	const terminalContainerRef = useRef<HTMLDivElement | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [loadingProgress, setLoadingProgress] = useState(0);
	const [hasLoadingStarted, setHasLoadingStarted] = useState(false);
	const [isLoaded, setIsLoaded] = useState(false);
	const navigate = useNavigate();
	const floppy_readRef = useRef(new Audio(floppy_read));
	const introSoundRef = useRef(new Audio(introSound));
	const [isTwoFAEnabled, setIsTwoFAEnabled] = useState(false);
	const [showSecondButton, setShowSecondButton] = useState(false);

	const tryToPlaySound = (toPlay: HTMLAudioElement) => {
		toPlay.play().catch(() => {});
	};

	useEffect(() => {
		fetchTerminalData();
		return () => {
			// floppy_readRef.current.pause();
			fadeOutAudio();
		};
	}, []);
	const fadeOutAudio = () => {
		let fadeOutInterval = setInterval(() => {
			// Réduire le volume de 0.1 à chaque intervalle
			if (floppy_readRef.current.volume > 0.1) {
				floppy_readRef.current.volume -= 0.1;
			} else {
				// Arrêter le son et réinitialiser le volume
				floppy_readRef.current.pause();
				floppy_readRef.current.currentTime = 0;
				floppy_readRef.current.volume = 1.0; // Réinitialiser le volume à la valeur originale
				clearInterval(fadeOutInterval);
			}
		}, 100); // Interval de 100 ms
	};
	const fetchTerminalData = () => {
		const queryParams = new URLSearchParams(window.location.search);
		const code = queryParams.get("code");
		if (!code) {
			navigate("/");
		}

		if (code && !isRequestSent) {
			const requestOptions: RequestInit = {
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				method: "POST",
				body: JSON.stringify({ code }),
			};

			fetch(process.env.REACT_APP_NEST_URL + "/auth/42", requestOptions)
				.then((response) => {
					if (!response.ok) {
						throw new Error(
							`HTTP error! Status: ${response.status}`
						);
					}
					const contentType = response.headers.get("content-type");
					if (
						contentType &&
						contentType.includes("application/json")
					) {
						return response.json();
					} else {
						throw new Error("Response is not in JSON format");
					}
				})
				.then((data) => {
					setResponseData(data);
					console.log("Success:", data);
					//data.message is only present if there is an error in the oauth process
					if (data.message) {
						navigate("/app");
						return;
					}
					if (data.username) {
						setTerminalLines([
							`Login: ${data.login}`,
							`Full Name: ${data.first_name} ${data.last_name}`,
							`Init done !`,
							`Rebooting...`,
						]);
						floppy_readRef.current.loop = true;
						return;
					}
					const lines = [
						`Login: ${data.login}`,
						`Full Name: ${data.first_name} ${data.last_name}`,
					];
					data.projects_users.forEach((project: any) => {
						let statusText = project.status;
						if (statusText) {
							if (project.status === "finished") {
								statusText = project["validated?"]
									? "success"
									: "failure";
							} else {
								statusText = "ongoing";
							}
							statusText = `<span class="${
								styles[statusText]
							}">${statusText.toUpperCase()}</span>`;
							lines.push(
								`${project.project.name} ► ${statusText}`
							);
						}
					});
					lines.push(`Init done !`);
					lines.push(`Rebooting...`);
					setTerminalLines(lines);
				})
				.catch((error) => {
					console.error("Error:", error);
					navigate("/");
				});
			setIsRequestSent(true);
		}
	};

	const startLoadingAnimation = () => {
		setTimeout(() => {
			setTerminalLines([]);
			setLinesDisplayed(0);
			setIsLoading(true);
			setLoadingProgress(0);
			setHasLoadingStarted(true);
			const logoTerminal = document.querySelector(
				`.${styles.logoTerminal}`
			) as HTMLImageElement;
			logoTerminal.style.display = "block";
		}, 1000);
	};

	const updateLoadingProgress = () => {
		console.log("updateLoadingProgress");
		if (isLoading) {
			const loadingInterval = setInterval(() => {
				setLoadingProgress((prev) => {
					const nextProgress = Math.min(
						prev + Math.floor(Math.random() * 25) + 15,
						100
					);
					const logoTerminal = document.querySelector(
						`.${styles.logoTerminal}`
					) as HTMLImageElement;
					if (nextProgress >= 100) {
						setTimeout(() => {
							setIsLoading(false);
							logoTerminal.style.display = "none";
							setIsLoaded(true);
						}, 1500);
					}
					return nextProgress;
				});
			}, 1000);

			return () => {
				clearInterval(loadingInterval);
			};
		}
	};

	useEffect(() => {
		if (startTerminalAnimation) {
			if (linesDisplayed < terminalLines.length) {
				const randomDelay = Math.floor(Math.random() * 300) + 100;
				// const randomDelay = Math.floor(Math.random() * 1) + 10;
				const timer = setTimeout(() => {
					setLinesDisplayed(
						(prevLinesDisplayed) => prevLinesDisplayed + 1
					);
				}, randomDelay);

				return () => {
					clearTimeout(timer);
				};
			}
			//if no more line
			if (linesDisplayed === terminalLines.length && !isLoading) {
				startLoadingAnimation();
			}
		}
	}, [linesDisplayed, terminalLines, startTerminalAnimation]);
	//gestion Overflow du terminal
	useEffect(() => {
		if (
			terminalContainerRef.current &&
			terminalContainerRef.current.scrollHeight >
				terminalContainerRef.current.clientHeight
		) {
			setTerminalLines((lines) => lines.slice(1));
			setLinesDisplayed((prevLinesDisplayed) => prevLinesDisplayed - 1);
		}
	}, [linesDisplayed]);

	useEffect(updateLoadingProgress, [isLoading]);

	useEffect(() => {
		if (isLoaded) {
			console.log("isLoaded");
			// floppy_readRef.current.pause();
			fadeOutAudio();
			try {
				tryToPlaySound(introSoundRef.current);
			} catch (error) {}
			if (responseData.twoFAEnabled) {
				setIsTwoFAEnabled(true);
			} else if (responseData.username) {
				navigate("/app", { state: { showAnimation: true } });
			} else {
				const apiAvatar = responseData.image.versions?.medium;
				navigate("/register", {
					state: {
						apiAvatar: apiAvatar ? apiAvatar : "",
						showAnimation: true,
					},
				});
			}
		}
	}, [isLoaded]);
	//function to set requestFullscreen to true but also take a boolean as parameter and if true set screen to fullscreen
	const fullscreenButton = (bool: boolean) => {
		setRequestFullscreen(true);
		setStartTerminalAnimation(true);
		floppy_readRef.current.loop = true;
		tryToPlaySound(floppy_readRef.current);
		if (bool) {
			document.documentElement.requestFullscreen();
		}
	};
	const showButtons = () => {
		// Afficher le premier bouton
		const timer = setTimeout(() => {
			setShowSecondButton(true);
		}, 1100);
		return (
			<>
				<div className={`${styles.buttonContainer}`}>
					<div className={styles.loginCursorContainer}>
						<p className={styles.loginCursor}>►&nbsp;</p>
					</div>
					<button
						className={`${styles.LoginButton}`}
						onClick={() => fullscreenButton(true)}
					>
						Yes
					</button>
				</div>

				{showSecondButton && (
					<div className={`${styles.buttonContainer}`}>
						<div className={styles.loginCursorContainer}>
							<p className={styles.loginCursor}>►&nbsp;</p>
						</div>
						<button
							className={`${styles.LoginButton}`}
							onClick={() => fullscreenButton(false)}
						>
							No
						</button>
					</div>
				)}
			</>
		);
	};
	if (isTwoFAEnabled) {
		return <TwoFAVerif username={responseData.username} />;
	} else if (!requestFullscreen) {
		return (
			<div>
				<h1 className={`terminalFont`}>FULLSCREEN MODE ?</h1>
				{showButtons()}
			</div>
		);
	} else {
		return (
			<div className={styles.App}>
				{responseData ? (
					<div
						ref={terminalContainerRef}
						className={styles.terminalContainer}
						style={{ maxHeight: "95vh" }}
					>
						{terminalLines
							.slice(0, linesDisplayed)
							.map((line, index) => (
								<h1
									key={index}
									className={`terminalFont`}
									dangerouslySetInnerHTML={{ __html: line }}
								/>
							))}
						<div className={styles.loadingAnimation}>
							<video
								autoPlay
								loop
								muted
								preload="auto"
								src={logo}
								className={styles.logoTerminal}
							/>
							{/* <img src={logo} alt="logo" className={styles.logoTerminal} /> */}
							{isLoading && (
								<div
									className={`${styles.loadingBarContainer} ${
										isLoading ? styles.visible : ""
									}`}
									id="loadingBarContainer"
								>
									<div
										className={styles.loadingBar}
										style={{ width: `${loadingProgress}%` }}
									/>
								</div>
							)}
						</div>
					</div>
				) : (
					<h1 className={`terminalFont`}>Loading...</h1>
				)}
			</div>
		);
	}
}

export default LoginRedirect;
