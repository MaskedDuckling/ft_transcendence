import React, { useState, useEffect, useRef } from "react";
import styles from "../assets/styles/Login.module.css";
import TwoFA from "../components/TwoFA";
import { useNavigate, useLocation } from "react-router-dom";
import fetchProtect from "../services/fetchProtect";

function Login() {
	const redirectTo42 = () => {
		if (process.env.REACT_APP_42_URL) {
			window.location.href = process.env.REACT_APP_42_URL;
		}
	};
	const location = useLocation();
	const queryParams = new URLSearchParams(location.search);
	const errorCode = queryParams.get("error");
	const [fetchError, setFetchError] = useState("");
	useEffect(() => {
		if (!errorCode) {
			return;
		}
		window.history.replaceState(
			{},
			document.title,
			window.location.pathname
		);
		if (errorCode == "403") {
			setFetchError("Your session has expired. Please login again.");
		}
	}, [errorCode]);
	const [serverDown, setServerDown] = useState(false);

	//////////////////////////////////////////////////// TODO:  DEV PURPOSE /////////////////////////
	interface User {
		id: string;
		username: string;
	}
	const [userList, setUserList] = useState<User[]>([]);
	useEffect(() => {
		if (serverDown) {
			return;
		}
		fetchProtect(
			process.env.REACT_APP_NEST_URL + "/auth/userlist",
			{},
			navigate
		)
			.then((data) => setUserList(data))
			.catch((error) => console.error("Error:", error));
	}, [serverDown]);
	const navigate = useNavigate();
	const [userId, setUserId] = useState("");
	const fakelogin = () => {
		if (!userId) {
			alert("Veuillez entrer un USER ID avant de vous connecter.");
			return;
		}
		console.log("fakelogin to user id", userId);
		const requestOptions: RequestInit = {
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
			method: "POST",
			body: JSON.stringify({ userid: userId }),
		};
		fetchProtect(
			process.env.REACT_APP_NEST_URL + "/auth/fakelogin",
			requestOptions,
			navigate
		)
			.then((data) => {
				console.log(data);
				alert(
					"Vous êtes désormais connecté en tant que " +
						data.username +
						" !"
				);
				navigate("/app");
			})
			.catch(async (errorPromise) => {
				// Utilisez "async" pour pouvoir utiliser "await"
				console.error("Erreur lors de la connexion :", errorPromise);
				// Si l'erreur provient du serveur (backend) et contient un message dans le corps de la réponse
				try {
					const errorMessage = await errorPromise; // Attendre que la promesse se résolve
					console.log(errorMessage); // Affichez le corps de la réponse ici pour le débogage
					alert(
						"Erreur lors de la connexion : " + errorMessage.error
					);
				} catch (error) {
					alert("Erreur lors de la connexion. Veuillez réessayer.");
				}
			});
	};
	////////////////////////////////////////////////////// END DEV PURPOSE /////////////////////////

	const [showButtonsSchool, setShowButtonsSchool] = useState(false);
	const [showButtonsGoogle, setShowButtonsGoogle] = useState(false);
	const headerRef = useRef<HTMLHeadingElement | null>(null);
	let intervalId: ReturnType<typeof setInterval> | null = null;
	let intervalRetry: ReturnType<typeof setInterval> | null = null;
	const [retryTime, setRetryTime] = useState(5);
	const [randomKey, setRandomKey] = useState(Math.random());

	const serverTest = () => {
		fetch(process.env.REACT_APP_NEST_URL + "/test", {})
			.then((data) => {
				setServerDown(false);
				clearInterval(intervalId as ReturnType<typeof setInterval>);
				clearInterval(intervalRetry as ReturnType<typeof setInterval>);
			})
			.catch((error) => {
				console.error("Error:", error);
				setServerDown(true);
				setRandomKey(Math.random());
				clearInterval(intervalId as ReturnType<typeof setInterval>);
				setTimeout(() => {
					setRetryTime(5);
					intervalId = setInterval(() => {
						serverTest();
					}, 5000);
					if (!intervalRetry) {
						intervalRetry = setInterval(() => {
							if (retryTime > 0) {
								setRetryTime((prev) => Math.max(prev - 1, 0));
							}
						}, 1000);
					}
				}, 1000);
			});
	};
	useEffect(() => {
		serverTest();
	}, []);
	useEffect(() => {
		if (!serverDown) {
			const headerElem = headerRef.current;
			if (headerElem) {
				console.log("headerElem", headerElem);
				const handleAnimationEnd = () => {
					setShowButtonsSchool(true);
					headerElem.style.borderRight = "none";
					const loginCursorElem = document.querySelector(
						`.${styles.loginCursor}`
					) as HTMLElement;
					if (loginCursorElem) {
						loginCursorElem.style.display = "block";
					}
				};
				headerElem.addEventListener("animationend", handleAnimationEnd);
				return () => {
					headerElem.removeEventListener(
						"animationend",
						handleAnimationEnd
					);
				};
			}
		}
	}, [serverDown]);
	useEffect(() => {
		if (showButtonsSchool) {
			const handleAnimationEnd = () => {
				const buttonElem = document.getElementById("fortytwoButton");
				if (buttonElem) {
					buttonElem.style.borderRight = "none";
				}
				setShowButtonsGoogle(true);
				// show the second .loginCursor
				const loginCursorElem = document.querySelectorAll(
					`.${styles.loginCursor}`
				)[1] as HTMLElement;
				if (loginCursorElem) {
					loginCursorElem.style.display = "block";
				}
			};
			const buttonElem = document.querySelector(
				`.${styles.fortytwoButton}`
			);
			if (buttonElem) {
				buttonElem.addEventListener("animationend", handleAnimationEnd);
				return () => {
					buttonElem.removeEventListener(
						"animationend",
						handleAnimationEnd
					);
				};
			}
		}
	}, [showButtonsSchool]);

	useEffect(() => {
		if (showButtonsGoogle) {
			const handleAnimationEndGoogle = () => {
				const buttonElem = document.querySelector(
					`.${styles.googleButton}`
				) as HTMLElement;
				if (buttonElem) {
					buttonElem.style.borderRight = "none";
				}
			};
			const buttonElemGoogle = document.querySelector(
				`.${styles.googleButton}`
			);
			if (buttonElemGoogle) {
				buttonElemGoogle.addEventListener(
					"animationend",
					handleAnimationEndGoogle
				);
				return () => {
					buttonElemGoogle.removeEventListener(
						"animationend",
						handleAnimationEndGoogle
					);
				};
			}
		}
	}, [showButtonsGoogle]);

	useEffect(() => {
		document.body.classList.add(styles.body);
		return () => {
			document.body.classList.remove(styles.body);
		};
	}, []);
	if (serverDown) {
		return (
			<div className={styles.serverDown}>
				<h1 className={styles.serverDownTitle}>Server is down</h1>
				<p key={randomKey} className={styles.serverDownText}>
					Reattempting in {retryTime} seconds
				</p>
			</div>
		);
	} else {
		return (
			<div className={styles.loginFlex}>
				<div className={styles.Login}>
					{fetchError !== "" && (
						<div className={styles.errorContainer}>
							<p className={styles.serverDownTitle}>
								{fetchError}
							</p>
						</div>
					)}
					<div className={styles.LoginHeader}>
						<h1 className={`${styles.titleBash} terminalFont`}>
							» blackhole-v4.2$&nbsp;
						</h1>
						<div className={styles.titleBorder}>
							<h1
								className={`${styles.titleLogin} terminalFont`}
								ref={headerRef}
							>
								LOGIN
							</h1>
						</div>
					</div>
					<div className={styles.LoginContent}>
						<div className={`${styles.buttonContainer}`}>
							<div className={styles.loginCursorContainer}>
								<p className={styles.loginCursor}>►&nbsp;</p>
							</div>
							<button
								id="fortytwoButton"
								onClick={redirectTo42}
								className={`${styles.LoginButton} ${
									styles.fortytwoButton
								} ${
									showButtonsSchool
										? styles.show
										: styles.schoolHide
								}`}
							>
								42
							</button>
						</div>
						<div className={`${styles.buttonContainer}`}>
							<div className={styles.loginCursorContainer}>
								<p className={styles.loginCursor}>►&nbsp;</p>
							</div>
							<button
								className={`${styles.LoginButton} ${
									styles.googleButton
								} ${
									showButtonsGoogle
										? styles.show
										: styles.googleHide
								}`}
							>
								Google
							</button>
						</div>
						{/* TODO: HERE INPUT AND BUTTON TO CALL fakeLogin and redirect to app */}
						<div>
							<select
								className={styles.LoginButton}
								style={{
									background: "#00000059",
									border: "1px solid #00C2AA",
								}}
								value={userId}
								onChange={(e) => setUserId(e.target.value)}
							>
								<option value="">Select user</option>
								{userList.map((user) => (
									<option key={user.id} value={user.id}>
										{user.username}
									</option>
								))}
							</select>
							<button
								onClick={fakelogin}
								className={styles.LoginButton}
							>
								Connect
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}
}

export default Login;
