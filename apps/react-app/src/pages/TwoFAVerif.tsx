import React, { useState, useEffect } from "react";
import App from "./App";
import { Navigate, useNavigate } from "react-router-dom";
import styles from "../assets/styles/TwoFAVerif.module.css";
import styles2 from "../assets/styles/TwoFA.module.css";
import fetchProtect from "../services/fetchProtect";

function TwoFAVerif({ username }: { username: string }) {
	const [verificationResult, setVerificationResult] = useState<
		boolean | null
	>(null);
	const [authCode, setAuthCode] = useState<string>("");
	const [avatar, setAvatar] = useState<string>("");
	const [verifText, setVerifText] = useState<string>("");
	const [isFormVisible, setIsFormVisible] = useState(true);
	const navigate = useNavigate();

	const getMyInfo = () => {
		const requestOptions: RequestInit = {
			credentials: "include",
			method: "GET",
			headers: { "Content-Type": "application/json" },
		};
		fetchProtect(
			process.env.REACT_APP_NEST_URL +
				"/auth/getavatar?username=" +
				username,
			requestOptions,
			navigate
		)
			.then((data) => {
				setAvatar(data.avatar);
				console.log(data);
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	};

	const handleAuthCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		let value = e.target.value;
		if (value.length === 3 && authCode.length === 2) {
			value = value + " ";
		} else if (value.length === 3 && authCode.length === 4) {
			value = value.substring(0, 2);
		}
		if (value.length <= 7) {
			setAuthCode(value);
		}
	};

	const handleVerifyAuthCode = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const authCodeWithoutSpace = authCode.replace(" ", "");

		const requestOptions: RequestInit = {
			credentials: "include",
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				authCode: authCodeWithoutSpace,
				username: username,
			}),
		};

		fetchProtect(
			process.env.REACT_APP_NEST_URL + "/2FA/verify",
			requestOptions,
			navigate
		)
			.then((data) => {
				const isValid = data.isValid;
				if (isValid) {
					setIsFormVisible(false);
					setTimeout(() => setVerificationResult(true), 300);
				} else {
					setVerificationResult(false);
				}
			})
			.catch((error) => {
				console.error("Error:", error);
				// TODO: penser a retirer cette ligne qui etait juste pour css et remplacer par une vraie bonne gestion d'erreur
				setVerificationResult(false);
			});
	};
	useEffect(() => {
		getMyInfo();
	}, []);

	useEffect(() => {
		if (verificationResult !== null) {
			if (verificationResult) {
				setVerifText("Code correct !");
			} else {
				setVerifText("Code incorrect !");
			}
		}
	}, [verificationResult]);

	if (verificationResult !== null && verificationResult) {
		return <Navigate to="/app" />;
	}
	return (
		<div className={styles.verifContainer}>
			<div className="crtMaskUp" />
			<div className="crtMaskDown" />
			<div className={styles.background}>
				<div className={styles.backgroundTop}>
					<div className={styles.backgroundLeft}></div>
					<div className={styles.backgroundCenter}></div>
					<div className={styles.backgroundRight}></div>
				</div>
				<div className={styles.backgroundBottom}></div>
			</div>
			<form className={styles.form} onSubmit={handleVerifyAuthCode}>
				<div
					className={
						isFormVisible
							? styles.formContainer
							: `${styles.formContainer} ${styles.formContainerHidden}`
					}
				>
					<img className={styles.avatar} src={avatar} alt="avatar" />
					<h1 className={styles.title}>{username}</h1>
					{/* <h1 className={styles.title} ></h1> */}
					<div className={styles.inputVerifContainer}>
						<input
							placeholder="2FA CODE"
							className={styles.inputVerif}
							type="text"
							value={authCode}
							onChange={handleAuthCodeChange}
						/>
						<button className={styles.buttonVerif} type="submit">
							→
						</button>
					</div>
					{verificationResult !== null && (
						<p className={styles.verifText}>{verifText}</p>
					)}
				</div>
			</form>
		</div>
	);
}

export default TwoFAVerif;
