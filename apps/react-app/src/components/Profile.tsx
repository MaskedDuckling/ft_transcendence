import React, { useEffect, useState, useContext } from "react";
import { GameContext } from "../pages/App";
import styles from "../assets/styles/Profile.module.css";
import fetchProtect from "../services/fetchProtect";
import { useNavigate } from "react-router-dom";
import SocketService from "../services/BLNSocketService";

import GlobeIcon from "../assets/images/globeIcon.svg";
import HomeIcon from "../assets/images/houseIconb.svg";
import AddFriendIcon from "../assets/images/addFriendIcon.svg";
import UnFriendIcon from "../assets/images/unFriendIcon.svg";
import PendingFriendIcon from "../assets/images/pendingFriendIcon.svg";

interface Match {
	user1: string;
	user2: string;
	outcome: boolean;
	finalScore: string;
	date: Date;
}

const FriendButton: React.FC<{
	isHeFriend: boolean;
	isHePending: boolean;
	username: string | null;
	sendFriendRequest: (username: string) => void;
	sendDeleteFriend: (username: string) => void;
}> = ({
	isHeFriend,
	isHePending,
	username,
	sendFriendRequest,
	sendDeleteFriend,
}) => {
	const handleClick = () => {
		if (!username) return;
		if (isHeFriend) {
			sendDeleteFriend(username);
		} else {
			sendFriendRequest(username);
		}
	};

	return (
		<button
			onClick={handleClick}
			className={`${styles.friendButtonContainer} ${
				isHeFriend ? styles.friendButtonContainerUnfriend : ""
			} ${isHePending ? styles.friendButtonContainerPending : ""}`}
			disabled={isHePending}
		>
			<img
				key={isHePending ? "pending" : isHeFriend ? "unfriend" : "add"}
				src={
					isHePending
						? PendingFriendIcon
						: isHeFriend
						? UnFriendIcon
						: AddFriendIcon
				}
				alt={isHeFriend ? "Unfriend" : "Add Friend"}
				className={styles.friendButton}
			/>
		</button>
	);
};

function UserProfile() {
	const [userAvatar, setUserAvatar] = useState<string | null>(null);
	const [userName, setUserName] = useState<string | null>(null);
	const [userGamesHistory, setuserGamesHistory] = useState<Match[]>();
	const [userWinRate, setUserWinRate] = useState<number | null>(null);
	const [searchUsername, setSearchUsername] = useState<string>("");
	const [username, setUsername] = useState<string | null>("");
	const [userNotFound, setUserNotFound] = useState<boolean>(false);
	const myUsername = React.useContext(GameContext).username;
	const myAvatar = React.useContext(GameContext).avatar;
	const searchContainerRef = React.useRef<HTMLDivElement>(null);
	const [key, setKey] = useState<number>(0);
	const wantedUsername = React.useContext(GameContext).wantedUsername;
	const setWantedUsername = React.useContext(GameContext).setWantedUsername;
	const navigate = useNavigate();
	const friend = useContext(GameContext).friends;
	const friendRequestsSent = useContext(GameContext).friendRequestsSent;
	const [isHePending, setIsHePending] = useState<boolean>(false);
	const [isHeFriend, setIsHeFriend] = useState<boolean>(false);
	const socketService = SocketService.getInstance();

	const sendFriendRequest = (username: string) => {
		socketService.sendFriendRequest(username);
	};
	const sendDeleteFriend = (username: string) => {
		socketService.sendDeleteFriend(username);
	};

	const checkIfFriend = () => {
		const isFriend = friend.some((friend) => friend.username === userName);
		setIsHeFriend(isFriend);
	};

	useEffect(() => {
		if (friend) {
			checkIfFriend();
		}
		if (friendRequestsSent.some((f) => f.username === userName)) {
			setIsHePending(true);
		} else {
			setIsHePending(false);
		}
	}, [userName, friend, friendRequestsSent]);

	useEffect(() => {
		console.log("wantedUsername", wantedUsername);
		setUsername(wantedUsername);
	}, [wantedUsername]);

	useEffect(() => {
		console.log("myUsername", myUsername);
		if (!wantedUsername || wantedUsername.trim() === "") {
			setWantedUsername(myUsername);
		}
	}, [myUsername]);

	const getProfile = (username: string | null) => {
		if (!username) return;
		fetchProtect(
			`${process.env.REACT_APP_NEST_URL}/profile/${username}`,
			{},
			navigate
		)
			.then((data) => {
				setUserAvatar(data.avatar);
				setUserName(data.username);
				setuserGamesHistory(data.userGamesHistory);
				setUserWinRate(data.winRate);
				setUserNotFound(false);
			})
			.catch((error) => {
				console.error("Error:", error);
				setUserNotFound(true);
			});
	};
	const handleOpponentClick = (opponentName: string) => {
		setSearchUsername(opponentName);
		setUsername(opponentName);
		searchContainerRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "nearest",
		});
	};
	const handleSearch = () => {
		setUsername(searchUsername); // Mettre à jour l'username pour déclencher le getProfile
	};

	const handleReset = () => {
		setUserNotFound(false);
		setSearchUsername("");
		setUsername(myUsername);
	};

	useEffect(() => {
		getProfile(username);
	}, [username]);

	useEffect(() => {
		if (username === myUsername) {
			setUserAvatar(myAvatar);
			if (key === 0) {
				setKey(1);
			} else {
				setKey(0);
			}
		}
	}, [username, myUsername, myAvatar]);
	//reset wanterUsername when leaving profile
	useEffect(() => {
		return () => {
			setWantedUsername("");
		};
	}, []);
	return (
		<div className={styles.fullContainer}>
			<div className={styles.searchContainer} ref={searchContainerRef}>
				<button className={styles.searchButton} onClick={handleReset}>
					<img className={styles.homeIcon} src={HomeIcon} alt="" />
				</button>
				<input
					type="text"
					className={styles.searchInput}
					value={searchUsername}
					onChange={(e) => setSearchUsername(e.target.value)}
					placeholder="Find a profile..."
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							handleSearch();
						}
					}}
				/>
				<button className={styles.searchButton} onClick={handleSearch}>
					→
				</button>
			</div>
			{userNotFound ? (
				<div className={styles.notFoundContainer}>
					<img
						className={styles.globe}
						src={GlobeIcon}
						alt="Globe icon"
					/>
					<h2 className={styles.notFoundText}>USER NOT FOUND</h2>
					<button className={styles.backBtn} onClick={handleReset}>
						My Profile
					</button>
				</div>
			) : (
				<>
					<img
						className={styles.avatar}
						src={userAvatar + "?" + key ?? ""}
						alt="User avatar"
					/>
					<div className={styles.usernameAndFriendButtonContainer}>
						<h2 className={styles.username}>{userName}</h2>
						{username !== myUsername && (
							<FriendButton
								isHeFriend={isHeFriend}
								isHePending={isHePending}
								username={userName}
								sendFriendRequest={sendFriendRequest}
								sendDeleteFriend={sendDeleteFriend}
							/>
						)}
					</div>
					<div className={styles.statContainer}>
						<h3 className={styles.statTitle}>Winrate: </h3>
						<h3
							className={
								userWinRate && userWinRate >= 50
									? styles.winRatePositive
									: styles.winRateNegative
							}
						>
							{userWinRate ? userWinRate.toFixed(2) + "%" : "N/A"}
						</h3>
					</div>
					<ul className={styles.matchContainer}>
						{userGamesHistory
							?.slice()
							.reverse()
							.map((match, index) => (
								<li className={styles.match} key={index}>
									<h1
										className={
											match.outcome
												? styles.victory
												: styles.defeat
										}
									>
										{match.outcome ? "VICTORY" : "DEFEAT"}
									</h1>
									<h2 className={styles.matchScore}>
										{match.finalScore}
									</h2>
									<h2
										onClick={() =>
											handleOpponentClick(
												match.user1 === userName
													? match.user2
													: match.user1
											)
										}
										className={styles.matchOpponent}
									>
										{match.user1 === userName
											? match.user2
											: match.user1}
									</h2>
								</li>
							))}
					</ul>
				</>
			)}
		</div>
	);
}

export default UserProfile;
