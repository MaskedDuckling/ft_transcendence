import React from "react";
import styles from "../assets/styles/Pong.module.css";

const PongLoading = ({ handleCancel }: { handleCancel: () => void }) => {
	return (
		<div className={styles.pongQueue}>
			<div className={styles.loaderContainer}>
				<h1 className={styles.loaderText}>MATCHMAKING</h1>
				<div className={styles.pongLoader}>
					<div className={styles.pongLoaderBall}></div>
				</div>
				<button className={styles.loaderCancel} onClick={handleCancel}>
					Cancel
				</button>
			</div>
		</div>
	);
};
const PongLoadingInvitation = ({
	handleCancelInvitation,
	username,
}: {
	handleCancelInvitation: () => void;
	username: string | null;
}) => {
	const capsUsername = username?.toUpperCase();
	return (
		<div className={styles.pongQueue}>
			<div className={styles.loaderContainer}>
				<h1 className={styles.loaderText}>
					WAITING FOR {capsUsername} TO ACCEPT
				</h1>
				<div className={styles.pongLoader}>
					<div className={styles.pongLoaderBall}></div>
				</div>
				<button
					className={styles.loaderCancel}
					onClick={handleCancelInvitation}
				>
					Cancel
				</button>
			</div>
		</div>
	);
};

export { PongLoading, PongLoadingInvitation };
