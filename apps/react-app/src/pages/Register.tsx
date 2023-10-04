import React, {
	useState,
	FormEvent,
	useEffect,
	useRef,
	useContext,
} from "react";
import styles from "../assets/styles/Register.module.css";
import { useLocation, useNavigate } from "react-router-dom";
import { GameContext } from "./App";

import defaultAvatar1 from "../assets/images/avatar1.jpg";
import defaultAvatar2 from "../assets/images/avatar2.jpg";
import { get } from "http";
import { Navigate } from "react-router-dom";
import fetchProtect from "../services/fetchProtect";

// interface RegisterProps {
// 	username?: string;
// }

const Register: React.FC<{
	storedUsername?: string;
	avatarUpdate?: boolean;
}> = ({ storedUsername = "", avatarUpdate = false }) => {
	const location = useLocation();
	const { avatar, setAvatar } = useContext(GameContext);
	const setShowRegisterModal = useContext(GameContext).setShowRegisterModal;
	let storedAvatar = "";
	if (avatarUpdate) {
		storedAvatar = avatar;
	}

	const container = useRef<HTMLDivElement>(null);
	const crtMaskUp = useRef<HTMLDivElement>(null);
	const crtMaskDown = useRef<HTMLDivElement>(null);
	const showAnimation: boolean =
		(location.state as any)?.showAnimation ?? false;
	useEffect(() => {
		if (!showAnimation) {
			if (container.current)
				container.current.classList.add("noAnimation");
			if (crtMaskUp.current)
				crtMaskUp.current.classList.add("noAnimation");
			if (crtMaskDown.current)
				crtMaskDown.current.classList.add("noAnimation");
		} else {
			navigate(".", {
				state: { ...location.state, showAnimation: false },
				replace: true,
			});
		}
	}, []);
	const apiAvatar = location.state?.apiAvatar;
	if (apiAvatar) {
		storedAvatar = apiAvatar;
		console.log("API AVATAR: ", storedAvatar);
	}
	const [username, setUsername] = useState(storedUsername || "");
	const [isUserCreated, setIsUserCreated] = useState(false);
	const [selectedAvatar, setSelectedAvatar] = useState(
		storedAvatar ? storedAvatar : defaultAvatar2
	);
	const [defaultAvatars, setDefaultAvatars] = useState(
		storedAvatar
			? [defaultAvatar1, storedAvatar, defaultAvatar2]
			: [defaultAvatar1, defaultAvatar2]
	);
	const [avatarInput, setAvatarInput] = useState<File | null>(null);
	const [usernameTaken, setUsernameTaken] = useState<boolean | string>(false);
	const [fileError, setFileError] = useState<boolean | string>(false);
	const imgContainerRef = useRef<HTMLDivElement>(null);
	const [customAvatar, setCustomAvatar] = useState<
		{ file: File; url: string }[]
	>([]);
	const allAvatars = [...defaultAvatars, ...customAvatar.map((ca) => ca.url)];
	const [imageKey, setImageKey] = useState(Date.now());
	const [applyAnimation, setApplyAnimation] = useState(false);
	const timerRef = useRef<NodeJS.Timeout | null>(null);
	const url = storedUsername ? "/auth/avatarUpdate" : "/auth/createUser";
	const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
	const navigate = useNavigate();
	const alertMessage = storedUsername
		? "Avatar modifié avec succès !"
		: "Utilisateur créé avec succès !";

	useEffect(() => {
		setUsernameTaken(false);
		// Annuler le timer précédent s'il y en a un
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}

		// Ne créez pas de nouveau timer si le storedUsername existe
		if (storedUsername) {
			return;
		}

		// Créer un nouveau timer
		timerRef.current = setTimeout(() => {
			if (username.trim() !== "") {
				checkUsername();
			}
		}, 1000); // 2000 ms, soit 2 secondes

		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
		};
	}, [username, storedUsername]);

	const checkUsername = async () => {
		if (username.trim() === "") {
			return; // Ne fait rien si l'username est vide
		}
		try {
			const requestOptions: RequestInit = {
				credentials: "include",
				method: "GET",
			};
			const response = await fetch(
				process.env.REACT_APP_NEST_URL +
					"/auth/usernameChecker?username=" +
					username,
				requestOptions
			);
			const data = await response.json();
			if (data.isUsernameTaken) {
				setUsernameTaken(data.isUsernameTaken);
			} else {
				setUsernameTaken(false);
			}
		} catch (error) {
			console.error(
				"Erreur lors de la vérification du nom d'utilisateur : ",
				error
			);
		}
	};

	const handleAvatarSelection = (avatar: string, index: number) => {
		setSelectedAvatar(avatar);
		setAvatarInput(null); // réinitialise l'avatar téléchargé

		// Déplacement de l'élément imgChooserContainer pour centrer l'élément cliqué
		if (imgContainerRef.current) {
			const avatarElements =
				imgContainerRef.current.getElementsByClassName(
					styles.avatarOption
				);
			const avatarElement = avatarElements[index] as HTMLElement;
			const containerWidth = imgContainerRef.current.offsetWidth;
			const avatarWidth = avatarElement.offsetWidth;
			const avatarOffsetLeft = avatarElement.offsetLeft;
			const centerOffset =
				(containerWidth - avatarWidth) / 2 - avatarOffsetLeft;
			imgContainerRef.current.style.left = `${centerOffset}px`;
		}
	};

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files && event.target.files.length > 0) {
			const file = event.target.files[0];
			const maxSize = 8 * 1000000;
			if (file.size > maxSize) {
				setFileError("File size too big, limit is 8MB");
				return;
			} else if (!allowedTypes.includes(file.type)) {
				setFileError("File type not supported");
				return;
			}
			setFileError(false);
			const imageUrl = URL.createObjectURL(file);
			setCustomAvatar((prev) => [...prev, { file, url: imageUrl }]);
		}
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!usernameTaken) {
			const formData = new FormData();
			formData.append("username", username);
			if (avatarInput) {
				formData.append("avatar", avatarInput);
			} else if (selectedAvatar) {
				// Récupérer le fichier binaire de l'image par défaut
				const response = await fetch(selectedAvatar);
				const blob = await response.blob();
				const file = new File([blob], "defaultAvatar.jpg", {
					type: "image/jpeg",
				});
				formData.append("avatar", file);
			}

			try {
				const requestOptions: RequestInit = {
					credentials: "include",
					method: "POST",
					body: formData,
				};
				await fetchProtect(
					process.env.REACT_APP_NEST_URL + url,
					requestOptions,
					navigate
				)
					.then((data) => {
						console.log("data: ", data);
						if (data.isUsernameTaken) {
							setUsernameTaken(data.isUsernameTaken);
						} else {
							setUsernameTaken(false);
						}
						if (data) {
							console.log("User created !");
							setIsUserCreated(true);
						}
					})
					.catch((error) => {
						console.error("Error:", error);
						setFileError(error.message);
					});
			} catch (error) {
				// Erreur de réseau ou autre erreur lors de l'envoi de la requête
				console.error(
					"Erreur lors de la création de l'utilisateur : ",
					error
				);
				alert("Erreur lors de la création de l'utilisateur: " + error);
			}
		} else {
			// alert("Ce nom d'utilisateur est déjà pris !");
		}
	};

	useEffect(() => {
		document.body.classList.add(styles.body);
		return () => {
			document.body.classList.remove(styles.body);
		};
	}, []);

	//default avatar
	useEffect(() => {
		handleAvatarSelection(selectedAvatar, 1);
	}, []);
	useEffect(() => {
		setFileError(false);
	}, [selectedAvatar]);
	//custom avatar
	useEffect(() => {
		if (customAvatar.length > 0) {
			const lastCustomAvatar = customAvatar[customAvatar.length - 1];
			handleAvatarSelection(lastCustomAvatar.url, allAvatars.length - 1);
		}
	}, [customAvatar, allAvatars.length]);

	useEffect(() => {
		if (isUserCreated && storedUsername) {
			//TODO: Voir ce que l'on fait apres update, fermeture, notif et animations ? A voir !
			//   setImageKey(Date.now());
			setApplyAnimation(true);
			setTimeout(() => {
				// setApplyAnimation(false);
				setShowRegisterModal(false);
			}, 1500);
			setAvatar(avatar + "?" + Date.now());
		}
	}, [isUserCreated, storedUsername]);
	if (isUserCreated && !storedUsername) {
		console.log("Redirection vers l'application...");
		return <Navigate to="/app" />;
	} else {
		return (
			<div className={styles.container} ref={container}>
				<div className="crtMaskUp" ref={crtMaskUp} />
				<div className="crtMaskDown" ref={crtMaskDown} />
				{/* <div className={styles.background}>
					<div className={styles.backgroundTop}>
						<div className={styles.backgroundLeft}></div>
						<div className={styles.backgroundCenter}></div>
						<div className={styles.backgroundRight}></div>
					</div>
					<div className={styles.backgroundBottom}></div>
				</div> */}
				<form
					onSubmit={handleSubmit}
					className={`${styles.formContainer} ${
						applyAnimation ? styles.applyAnimation : ""
					}`}
				>
					<div className={styles.formRegister}>
						<div className={styles.imgChooserContainer}>
							<div
								className={styles.imgChooser}
								ref={imgContainerRef}
							>
								{allAvatars.map((avatar, index) => {
									let avatarUrl;
									if (
										typeof avatar === "string" &&
										avatar.startsWith("/")
									) {
										// si l'avatar est une URL (string) et qu'elle n'est pas un blob, ajoutez simplement la clé de l'image
										avatarUrl = `${avatar}?${imageKey}`;
									} else {
										// si l'avatar est un blob ou un objet File, utilisez simplement l'URL telle quelle
										avatarUrl = avatar;
									}
									return (
										<div
											key={index}
											className={`${
												styles.avatarOption
											} ${
												selectedAvatar === avatar
													? styles.selected
													: styles.notSelected
											} ${
												applyAnimation &&
												selectedAvatar === avatar
													? styles.applyAnimationAvatar
													: ""
											}`}
											onClick={() =>
												handleAvatarSelection(
													avatar,
													index
												)
											}
										>
											<img
												src={avatarUrl}
												alt={`Avatar ${index + 1}`}
												className={styles.imgChooser}
											/>
										</div>
									);
								})}

								<div
									className={`${styles.fileInputContainer} ${styles.avatarOption} `}
								>
									<label
										htmlFor="fileInput"
										className={styles.fileInputLabel}
									>
										<span className={styles.fileInputIcon}>
											+
										</span>
										<input
											type="file"
											id="fileInput"
											className={styles.fileInput}
											accept={allowedTypes.join(", ")}
											onChange={handleFileUpload}
										/>
									</label>
								</div>
							</div>
						</div>
						<div className={styles.inputContainer}>
							<label className={styles.inputLabel}>
								<input
									type="text"
									value={username}
									onBlur={
										storedUsername
											? undefined
											: checkUsername
									}
									onChange={
										storedUsername
											? undefined
											: (e) => setUsername(e.target.value)
									}
									placeholder="Username"
									className={styles.input}
									disabled={!!storedUsername}
								/>
							</label>
							<button className={styles.submit} type="submit">
								→
							</button>
						</div>
						<div
							className={`${styles.usernameTaken} ${
								usernameTaken ? styles.visible : ""
							}`}
						>
							{usernameTaken}
						</div>
						<div
							className={`${styles.usernameTaken} ${
								fileError ? styles.visible : ""
							}`}
						>
							{fileError}
						</div>
					</div>
					<div className={styles.background} />
				</form>
			</div>
		);
	}
};

export default Register;
