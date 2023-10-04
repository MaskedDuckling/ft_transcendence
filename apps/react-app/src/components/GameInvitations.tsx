import React, { useState, useEffect, useRef } from "react";
import styles from "../assets/styles/BLN.module.css";
import AcceptIcon from "../assets/images/acceptIcon.svg";
import DeclineIcon from "../assets/images/declineIcon.svg";
import ControllerIcon from "../assets/images/controller.svg";

type GameInvitation = {
	username: string; // Nom de l'utilisateur qui invite
};

type GameInvitationsProps = {
	invitations: GameInvitation[];
	handleAccept: (username: string) => void;
	handleReject: (username: string) => void;
};

type GameInvitationProps = {
	username: string;
	onAccept: (username: string) => void;
	onReject: (username: string) => void;
};

const BLNGameInvitation: React.FC<GameInvitationProps> = ({
	username,
	onAccept,
	onReject,
}) => {
	return (
		<>
			<div className={styles.FriendRequest}>
				<h3 className={styles.FriendRequestUsername}>{username}</h3>
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

const BLNGameInvitations: React.FC<GameInvitationsProps> = ({
	invitations,
	handleAccept,
	handleReject,
}) => {
	const [isExpanded, setIsExpanded] = useState<boolean>(false);
	const toggleList = () => {
		setIsExpanded(!isExpanded);
	};
	const dropdownGameInvitationsRef = useRef<HTMLDivElement | null>(null);
	const handleClickOutside = (e: any) => {
		if (
			dropdownGameInvitationsRef.current &&
			!dropdownGameInvitationsRef.current.contains(e.target)
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
			ref={dropdownGameInvitationsRef}
			className={styles.BLNFriendRequestsContainer}
		>
			<img
				className={`${styles.gameRequestsButton} ${
					invitations.length === 0
						? styles.FriendsRequestsButtonDisabled
						: ""
				}`}
				src={ControllerIcon}
				alt="ControllerIcon"
				onClick={toggleList}
			/>
			{invitations.length > 0 && (
				<p className={styles.FriendRequestsNumber}>
					{invitations.length}
				</p>
			)}
			{isExpanded && invitations.length > 0 && (
				<div className={styles.RequestdropdownMenu}>
					{invitations.map((invitation, index) => (
						<BLNGameInvitation
							key={index}
							username={invitation.username}
							onAccept={handleAccept}
							onReject={handleReject}
						/>
					))}
				</div>
			)}
		</div>
	);
};

export default BLNGameInvitations;
