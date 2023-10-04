import React from "react";
// import socket from "../pongSocket";
import createPongSocket from "../pongSocket";
import styles from "../assets/styles/PongLeave.module.css";

import WarningIcon from "../assets/images/warning.png";

function PongLeave({
	closePong,
	onClose,
}: {
	closePong: number;
	onClose: (value: number) => void;
}) {
	const socket = createPongSocket();

	const handleYes = () => {
		socket.emit("clientWantsToLeave");
		onClose(1);
	};

	const handleNo = () => {
		onClose(0);
	};

	return (
		<div className={styles.container}>
			<div className={styles.imgtxtContainer}>
				<img src={WarningIcon} alt="leave" className={styles.img} />
				<p className={styles.text}>
					Are you sure you want to leave?
					<br />
					It will count as a loss
				</p>
			</div>
			<div className={styles.btnContainer}>
				<button className={styles.btnYes} onClick={handleYes}>
					Yes
				</button>
				<button className={styles.btnNo} onClick={handleNo}>
					No
				</button>
			</div>
		</div>
	);
}

export default PongLeave;
