import React, { useEffect } from "react";
import styles from "../assets/styles/Popup.module.css";

interface PopupProps {
	message: string;
	x: number;
	y: number;
}

const Popup: React.FC<PopupProps> = ({ message, x, y }) => {
	return (
		<div
			style={{
				position: "absolute",
				top: y - 10,
				left: x - 60,
				zIndex: 1000,
			}}
			className={styles.popup}
		>
			<h1 className={styles.popupText}>{message}</h1>
		</div>
	);
};

export default Popup;
