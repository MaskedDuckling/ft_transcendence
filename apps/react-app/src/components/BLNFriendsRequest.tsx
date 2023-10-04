import React, { useState, useEffect, useRef } from "react";
import styles from "../assets/styles/BLN.module.css";
import AvatarIcon from "../assets/images/addFriendIcon.svg";
import AcceptIcon from "../assets/images/acceptIcon.svg";
import DeclineIcon from "../assets/images/declineIcon.svg";

type FriendRequest = {
	username: string;
	message: string;
};

type FriendRequestsProps = {
	requests: FriendRequest[];
	handleAccept: (username: string) => void;
	handleReject: (username: string) => void;
};

type FriendRequestProps = {
	username: string;
	message: string;
	onAccept: (username: string) => void;
	onReject: (username: string) => void;
};

const BLNFriendRequest: React.FC<FriendRequestProps> = ({
	username,
	message,
	onAccept,
	onReject,
}) => {
	return (
		<>
			<div className={styles.FriendRequest}>
				<h3 className={styles.FriendRequestUsername}>{username}</h3>
				{/* <button onClick={() => onAccept(username)}>Accepter</button>
			<button onClick={() => onReject(username)}>Refuser</button> */}
				<img
					className={styles.AcceptIcon}
					src={AcceptIcon}
					alt="AcceptIcon"
					onClick={() => onAccept(username)}
				/>
				<img
					className={styles.DeclineIcon}
					src={DeclineIcon}
					alt="DeclineIcon"
					onClick={() => onReject(username)}
				/>
			</div>
			<hr className={styles.FriendRequestHr} />
		</>
	);
};

const BLNFriendRequests: React.FC<FriendRequestsProps> = ({
	requests,
	handleAccept,
	handleReject,
}) => {
	const [isExpanded, setIsExpanded] = useState<boolean>(false);
	const toggleList = () => {
		setIsExpanded(!isExpanded);
	};
	const dropdownFriendsRequestsRef = useRef<HTMLDivElement | null>(null);
	const handleClickOutside = (e: any) => {
		if (
			dropdownFriendsRequestsRef.current &&
			!dropdownFriendsRequestsRef.current.contains(e.target)
		) {
			setIsExpanded(false);
		}
	};

	useEffect(() => {
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);
	return (
		<div
			ref={dropdownFriendsRequestsRef}
			className={styles.BLNFriendRequestsContainer}
		>
			<img
				className={`${styles.FriendsRequestsButton} ${
					requests.length === 0
						? styles.FriendsRequestsButtonDisabled
						: ""
				}`}
				src={AvatarIcon}
				alt="AvatarIcon"
				onClick={toggleList}
			/>
			{requests.length > 0 && (
				<p className={styles.FriendRequestsNumber}>{requests.length}</p>
			)}
			{isExpanded && requests.length > 0 && (
				<div className={styles.RequestdropdownMenu}>
					{requests.map((request, index) => (
						<BLNFriendRequest
							key={index}
							username={request.username}
							message={request.message}
							onAccept={handleAccept}
							onReject={handleReject}
						/>
					))}
				</div>
			)}
		</div>
	);
};

export default BLNFriendRequests;
