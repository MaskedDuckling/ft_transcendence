import { useState, useEffect } from "react";
import styles from "../assets/styles/TwoFA.module.css";

//IMG IMPORT
import TwoFAIcon from "../assets/images/lock.svg";
import fetchProtect from "../services/fetchProtect";
import { useNavigate } from "react-router-dom";

function TwoFA() {
	const [qrCode, setQRCode] = useState<string | null>(null);
	const [authCode, setAuthCode] = useState<string>("");
	const [verificationResult, setVerificationResult] = useState<
		boolean | null
	>(null);
	const [isTwoFAEnabled, setTwoFAEnabled] = useState<boolean>(false);
	const [isTwoFAAlreadyEnabled, setTwoFAAlreadyEnabled] =
		useState<boolean>(false);
	const [isToVerify, setToVerify] = useState<boolean>(false);
	const [isConfirm, setConfirm] = useState<boolean>(false);

	const navigate = useNavigate();
	const handleEnable2FA = () => {
		const requestOptions: RequestInit = {
			credentials: "include",
			method: "POST",
			headers: { "Content-Type": "application/json" },
		};

		fetchProtect(
			process.env.REACT_APP_NEST_URL + "/2FA/generate",
			requestOptions,
			navigate
		)
			.then((data) => {
				setQRCode(data.secretCode.qrCode);
				setTwoFAEnabled(true);
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	};

	const toVerify = () => {
		setQRCode(null);
		setToVerify(true);
	};

	const handleDisable2FA = () => {
		const requestOptions: RequestInit = {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
		};

		fetchProtect(
			process.env.REACT_APP_NEST_URL + "/2FA/delete",
			requestOptions,
			navigate
		)
			.then((data) => {
				setTwoFAAlreadyEnabled(false);
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	};

	const handleVerifyAuthCode = () => {
		// Verifie le two_factor_secret
		const code = authCode.replace(/ /g, "");
		const requestOptions: RequestInit = {
			credentials: "include",
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ authCode: code }),
		};

		fetchProtect(
			process.env.REACT_APP_NEST_URL + "/2FA/verifyAfterCreation",
			requestOptions,
			navigate
		)
			.then((data) => {
				const isValid = data.isValid;
				if (isValid) {
					setVerificationResult(true);
					setTwoFAEnabled(true);
				} else {
					setVerificationResult(false);
				}
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	};

	const handleCheck2FA = () => {
		const requestOptions: RequestInit = {
			credentials: "include",
			method: "GET",
		};

		fetchProtect(
			process.env.REACT_APP_NEST_URL + "/2FA/check",
			requestOptions,
			navigate
		)
			.then((data) => {
				setTwoFAAlreadyEnabled(data);
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	};
	useEffect(() => {
		handleCheck2FA();
	}, []);

	useEffect(() => {
		const inputVerifElement = document.querySelector(
			`.${styles.verifContainer}`
		) as HTMLElement;
		if (verificationResult === true && inputVerifElement) {
			inputVerifElement.style.display = "none";
		}
	}, [verificationResult]);

	const handleReturnToQRCode = () => {
		setVerificationResult(null);
		setToVerify(false);
		handleEnable2FA();
	};

	const handleReturnToEnable2FA = () => {
		setVerificationResult(null);
		setTwoFAEnabled(false);
		setToVerify(false);
		setTwoFAAlreadyEnabled(true);
	};

	const handleConfirm = () => {
		if (isConfirm == false) {
			setConfirm(true);
		} else {
			setConfirm(false);
		}
	};

	return (
		<>
			{!isTwoFAAlreadyEnabled ? (
				!isTwoFAEnabled ? (
					<div className={styles.enable2FaContainer}>
						<img
							className={styles.enable2FaImg}
							src={TwoFAIcon}
							alt="2FA"
						/>
						<button
							className={styles.enable2FaButton}
							onClick={handleEnable2FA}
						>
							Activer 2FA
						</button>
					</div>
				) : (
					<>
						{qrCode !== null ? (
							<div className={styles.qrContainer}>
								<p>
									Veuillez scanner le QR Code avec une
									application TOTP:
								</p>
								<img
									className={styles.qrcode}
									src={qrCode}
									alt="QR Code"
								/>
								<button onClick={toVerify}>Suivant</button>
							</div>
						) : (
							""
						)}
						{isToVerify ? (
							<div>
								<div className={styles.verifContainer}>
									<p className={styles.text}>
										Veuillez entrer le code de vérification
										:
									</p>
									<input
										className={styles.inputVerif}
										maxLength={7}
										type="text"
										value={authCode}
										onChange={(e) => {
											const val = e.target.value.replace(
												/ /g,
												""
											);
											let formattedVal = val;
											if (val.length > 3) {
												formattedVal = `${val.slice(
													0,
													3
												)} ${val.slice(3)}`;
											}
											setAuthCode(
												formattedVal.slice(0, 7)
											);
										}}
									/>
									<button
										className={styles.buttonVerif}
										onClick={handleVerifyAuthCode}
									>
										Vérifier
									</button>
								</div>
								{verificationResult !== null && (
									<div>
										{verificationResult ? (
											<>
												<p
													className={
														styles.inputValid
													}
												>
													2FA ACTIVE
												</p>
												<button
													className={
														styles.returnButton
													}
													onClick={
														handleReturnToEnable2FA
													}
												>
													Terminer
												</button>
											</>
										) : (
											<>
												<p
													className={
														styles.inputError
													}
												>
													CODE INVALIDE
												</p>
												<button
													className={
														styles.returnButton
													}
													onClick={
														handleReturnToQRCode
													}
												>
													Retour au QR Code
												</button>
											</>
										)}
									</div>
								)}
							</div>
						) : (
							""
						)}
					</>
				)
			) : (
				<div>
					<p className={styles.text}>LE 2FA EST DEJA ACTIF</p>
					<button
						className={styles.returnButton}
						onClick={handleConfirm}
					>
						DESACTIVER LE 2FA
					</button>
					{isConfirm === true && (
						<div
							className={`${styles.confirmContainer} ${
								isConfirm ? styles.slideDown : ""
							}`}
						>
							<p className={styles.inputError}>
								ETES-VOUS SUR DE VOULOIR DESACTIVER LE 2FA ?
							</p>
							<div className={`${styles.confirmChoiceContainer}`}>
								<button
									className={styles.confirmNo}
									onClick={handleDisable2FA}
								>
									OUI
								</button>
								<button
									className={styles.confirmYes}
									onClick={() => setConfirm(false)}
								>
									NON
								</button>
							</div>
						</div>
					)}
				</div>
			)}
		</>
	);
}

export default TwoFA;
