import React, {
	useState,
	useEffect,
	useContext,
	useRef,
	ChangeEvent,
	FormEvent,
} from "react";
import SocketService from "../services/BLNSocketService";
import { GameContext } from "../pages/App";
import BLNFriendRequests from "./BLNFriendsRequest";
import GameInvitations from "./GameInvitations";
import styles from "../assets/styles/BLN.module.css";

import BlnIcon from "../assets/images/blnIcon.svg";
import GearIcon from "../assets/images/gearIcon.svg";

interface CreateChannelProps {
	socketService: SocketService;
	channelCreationStatus: string;
	setChannelCreationStatus: (status: string) => void;
	setMenuAction: (action: string | null) => void;
}

interface JoinChannelFormProps {
	joinChannelByName: (e: FormEvent) => void;
	channelName: string;
	setChannelName: (channelName: string) => void;
	isPasswordRequired: boolean;
	channelPassword: string;
	handleChannelPasswordChange: (e: ChangeEvent<HTMLInputElement>) => void;
	error: string | null;
}

interface FriendRequest {
	from: Array<{ username: string }>;
	sent: Array<{ username: string }>;
}

const JoinChannelForm: React.FC<JoinChannelFormProps> = ({
	joinChannelByName,
	channelName,
	setChannelName,
	isPasswordRequired,
	channelPassword,
	handleChannelPasswordChange,
	error,
}) => {
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		joinChannelByName && joinChannelByName(e);
		setTimeout(() => {
			handleChannelPasswordChange({ target: { value: "" } } as any);
		}, 100);
	};
	return (
		<div className={styles.joinChannelContainer}>
			<form className={styles.joinChannelForm} onSubmit={handleSubmit}>
				<input
					className={styles.joinChannelInput}
					type="text"
					value={channelName}
					onChange={(e) => setChannelName(e.target.value)}
					placeholder="Name"
				/>
				{isPasswordRequired && (
					<input
						className={styles.joinChannelPassword}
						type="password"
						value={channelPassword}
						onChange={handleChannelPasswordChange}
						placeholder="Password"
					/>
				)}
				<button className={styles.joinChannelSubmit} type="submit">
					Join
				</button>
			</form>
			{error && <p className={styles.errorTextStatus}>{error}</p>}
		</div>
	);
};

const CreateChannel: React.FC<CreateChannelProps> = ({
	socketService,
	channelCreationStatus,
	setChannelCreationStatus,
	setMenuAction,
}) => {
	const [step, setStep] = useState<number>(0);
	const [newChannelName, setNewChannelName] = useState<string>("");
	const [newChannelType, setNewChannelType] = useState<string>("public");
	const [newChannelPassword, setNewChannelPassword] = useState<string>("");
	const [verifyChannelPassword, setVerifyChannelPassword] =
		useState<string>("");
	const [errorText, setErrorText] = useState<string>("");
	const [successText, setSuccessText] = useState<string>("");

	const createChannel = (e: React.FormEvent) => {
		e.preventDefault();
		socketService.createChannel(
			newChannelName,
			newChannelType,
			newChannelPassword
		);
		setNewChannelName("");
		setNewChannelType("public");
		setNewChannelPassword("");
		setVerifyChannelPassword("");
		setStep(5);
	};
	const restartComponent = () => {
		setStep(0);
		setNewChannelName("");
		setNewChannelType("public");
		setNewChannelPassword("");
		setVerifyChannelPassword("");
		setErrorText("");
		setSuccessText("");
		setChannelCreationStatus("");
		setMenuAction(null);
	};
	useEffect(() => {
		setChannelCreationStatus("");
		return () => {
			setChannelCreationStatus("");
		};
	}, []);
	useEffect(() => {
		if (channelCreationStatus === "") return;
		if (channelCreationStatus.includes("created")) {
			// setMenuAction(null);
			setSuccessText(channelCreationStatus);
			setTimeout(() => {
				setSuccessText("");
				setMenuAction(null);
			}, 2000);
		} else {
			setErrorText(channelCreationStatus);
			setTimeout(() => {
				restartComponent();
			}, 5000);
		}
	}, [channelCreationStatus]);

	const handleNext = () => {
		if (
			(step === 1 && newChannelName === "") ||
			(step === 2 &&
				newChannelType === "password_protected" &&
				newChannelPassword === "")
		) {
			return;
		}
		setStep(step + 1);
	};

	const handleBack = () => {
		setStep(step - 1);
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
		}
	};

	return (
		<div
			className={`${styles.createChannelContainer} ${
				successText ? styles.successFade : ""
			}`}
		>
			{/* <h2>Create a new channel</h2> */}
			<form
				className={styles.createChannelForm}
				onSubmit={createChannel}
				onKeyPress={handleKeyPress}
			>
				<button
					type="button"
					className={styles.stepButton}
					onClick={handleBack}
					disabled={step === 0 || step === 5}
				>
					←
				</button>

				{step === 0 && (
					<select
						className={styles.createChannelSelect}
						value={newChannelType}
						onChange={(e) => setNewChannelType(e.target.value)}
					>
						<option value="public">Public</option>
						<option value="private">Private</option>
						<option value="password_protected">
							Password Protected
						</option>
					</select>
				)}
				{step === 1 && (
					<input
						type="text"
						value={newChannelName}
						className={styles.createChannelInput}
						onChange={(e) => setNewChannelName(e.target.value)}
						placeholder="Channel name"
						required
					/>
				)}

				{step === 2 && newChannelType !== "password_protected" && (
					<button
						className={styles.createChannelSubmit}
						type="submit"
					>
						Create Channel
					</button>
				)}
				{step === 2 && newChannelType === "password_protected" && (
					<input
						type="password"
						className={styles.createChannelInput}
						value={newChannelPassword}
						onChange={(e) => setNewChannelPassword(e.target.value)}
						placeholder="Password"
						required
					/>
				)}
				{step === 3 && newChannelType === "password_protected" && (
					<input
						type="password"
						className={styles.createChannelInput}
						value={verifyChannelPassword}
						onChange={(e) =>
							setVerifyChannelPassword(e.target.value)
						}
						placeholder="Verify password"
						required
					/>
				)}
				{step === 4 && newChannelType === "password_protected" && (
					<button
						className={styles.createChannelSubmit}
						type="submit"
						disabled={newChannelPassword !== verifyChannelPassword}
					>
						Create Channel
					</button>
				)}
				{step == 5 && (
					<>
						{errorText && (
							<p className={styles.errorTextStatus}>
								{errorText}
							</p>
						)}
						{successText && (
							<p className={styles.successTextStatus}>
								{successText}
							</p>
						)}
					</>
				)}
				<button
					type="button"
					className={styles.stepButton}
					onClick={handleNext}
					disabled={
						(step === 2 &&
							newChannelType !== "password_protected") ||
						(step === 3 &&
							newChannelPassword !== verifyChannelPassword) ||
						step === 4 ||
						step === 5
					}
				>
					→
				</button>
			</form>
		</div>
	);
};

const CreateOrJoinChannelDropdown: React.FC<{
	setMenuAction: (action: string | null) => void;
}> = ({ setMenuAction }) => {
	const dropdownRef = useRef<HTMLDivElement | null>(null);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const handleClickOutside = (e: any) => {
		if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
			setIsDropdownOpen(false);
		}
	};

	useEffect(() => {
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			setMenuAction(null);
		};
	}, []);
	return (
		<div onClick={(e) => e.stopPropagation()} ref={dropdownRef}>
			<button
				className={styles.createGroupButton}
				onClick={() => setIsDropdownOpen(!isDropdownOpen)}
			>
				+
			</button>
			{isDropdownOpen && (
				<div className={styles.dropdownMenu}>
					<button
						onClick={() => {
							setMenuAction("create");
							setIsDropdownOpen(false);
						}}
					>
						Créer un groupe
					</button>
					<button
						onClick={() => {
							setMenuAction("join");
							setIsDropdownOpen(false);
						}}
					>
						Rejoindre un groupe
					</button>
				</div>
			)}
		</div>
	);
};

const ManageFriendDropdown: React.FC<{
	username: string;
	sendDeleteFriend: (username: string) => void;
	openProfile: (username: string) => void;
	socketService: SocketService;
}> = ({ username, sendDeleteFriend, openProfile, socketService }) => {
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement | null>(null);
	const [blockList, setBlockList] = [
		useContext(GameContext).blockList,
		useContext(GameContext).setBlockList,
	];
	const [isHeBlocked, setIsHeBlocked] = useState<boolean>(false);

	const handleClickOutside = (e: any) => {
		if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
			setIsDropdownOpen(false);
		}
	};
	useEffect(() => {
		if (blockList.some((b) => b.username === username)) {
			setIsHeBlocked(true);
		} else {
			setIsHeBlocked(false);
		}
	}, [JSON.stringify(blockList)]);
	useEffect(() => {
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);
	const blockButton = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (isHeBlocked) {
			setBlockList(blockList.filter((b) => b.username !== username));
		} else {
			setBlockList([...blockList, { username: username }]);
		}
	};
	const unfriendButton = (e: React.MouseEvent) => {
		e.stopPropagation();
		sendDeleteFriend(username);
		setIsDropdownOpen(false);
	};
	const gameInvitationSent = useContext(GameContext).gameInvitationSent;
	const inviteToGame = (username: string) => {
		socketService.sendGameInvitation(username);
	};
	return (
		<div onClick={(e) => e.stopPropagation()} ref={dropdownRef}>
			<button
				className={styles.friendListButton}
				onClick={() => setIsDropdownOpen(!isDropdownOpen)}
			>
				...
			</button>
			{isDropdownOpen && (
				<div className={styles.dropdownMenu}>
					<button onClick={() => openProfile(username)}>
						Profile
					</button>
					{gameInvitationSent ? (
						<button disabled className={styles.disabledButton}>
							Invitation Sent...
						</button>
					) : (
						<button onClick={() => inviteToGame(username)}>
							Invite to game
						</button>
					)}
					<button
						className={styles.deleteFriend}
						onClick={(e) => {
							unfriendButton(e);
						}}
					>
						Unfriend
					</button>
					{isHeBlocked ? (
						<button onClick={blockButton}>Unblock</button>
					) : (
						<button onClick={blockButton}>Block</button>
					)}
				</div>
			)}
		</div>
	);
};

const ChannelList: React.FC<{
	joinedChannels: string[];
	switchChannel: (channel: string) => void;
	menuAction: string | null;
	setMenuAction: (action: string | null) => void;
	friends: { username: string; status: string }[];
	sendDeleteFriend: (username: string) => void;
	sendLeaveChannel: (channelName: string) => void;
	openProfile: (username: string) => void;
	socketService: SocketService;
}> = ({
	joinedChannels,
	switchChannel,
	menuAction,
	setMenuAction,
	friends,
	sendDeleteFriend,
	sendLeaveChannel,
	openProfile,
	socketService,
}) => {
	// joinedChannels = Array(10).fill(joinedChannels).flat();
	const [isExpandedGroup, setIsExpandedGroup] = useState(true);
	const [isExpandedFriends, setIsExpandedFriends] = useState(true);
	const [isExpandedOffline, setIsExpandedOffline] = useState(false);
	const [friendsOnlineList, setFriendsOnlineList] = useState<
		{
			username: string;
			status: string;
		}[]
	>([]);
	const [friendsOfflineList, setFriendsOfflineList] = useState<
		{
			username: string;
			status: string;
		}[]
	>([]);
	const [dataLoaded, setDataLoaded] = useState(false);

	const toggleListGroups = () => {
		setIsExpandedGroup(!isExpandedGroup);
	};
	const toggleListFriends = () => {
		setIsExpandedFriends(!isExpandedFriends);
	};

	const toggleListOffline = () => {
		setIsExpandedOffline(!isExpandedOffline);
	};
	useEffect(() => {
		joinedChannels.sort();
	}, [JSON.stringify(joinedChannels)]);
	useEffect(() => {
		const friendsOnline = friends.filter(
			(friend) =>
				friend.status === "Online" ||
				friend.status === "In Queue" ||
				friend.status === "In-Game" ||
				friend.status === "In Training"
		);
		const friendsOffline = friends.filter(
			(friend) => friend.status === "Offline"
		);
		setFriendsOnlineList(friendsOnline);
		setFriendsOfflineList(friendsOffline);
		setTimeout(() => {
			setDataLoaded(true);
		}, 200);
	}, [JSON.stringify(friends)]);
	useEffect(() => {
		if (dataLoaded) {
			if (friendsOnlineList.length <= 0) {
				setIsExpandedFriends(false);
			}
			if (friendsOfflineList.length <= 0) {
				setIsExpandedOffline(false);
			}
		}
	}, [friendsOnlineList, friendsOfflineList, dataLoaded]);

	return (
		<>
			<div className={styles.groupsHeaderContainer}>
				<div onClick={toggleListGroups} className={styles.groupsHeader}>
					<div className={styles.groupsHeaderArrow}>
						{isExpandedGroup ? "▼" : "►"}
						<h3 className={styles.groupsHeaderText}>Groups</h3>
						<p className={styles.groupsHeaderCount}>
							({joinedChannels.length}){" "}
						</p>
					</div>
					<CreateOrJoinChannelDropdown
						setMenuAction={setMenuAction}
					/>
				</div>
				{isExpandedGroup && (
					<ul className={styles.channelList}>
						{joinedChannels.map((channel) => (
							<li
								key={channel}
								className={styles.channelListItem}
								onClick={() => switchChannel(channel)}
							>
								<div
									className={
										styles.channelListItemIconAndUsername
									}
								>
									<img
										className={styles.channelListItemIcon}
										src={BlnIcon}
										alt="blnIcon"
									/>
									<p className={styles.channelListItemText}>
										{channel}
									</p>
								</div>
								<button
									className={styles.channelListItemLeave}
									onClick={(e) => {
										e.stopPropagation();
										sendLeaveChannel(channel);
									}}
								>
									✖
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
			<div className={styles.groupsHeaderContainer}>
				<div
					onClick={toggleListFriends}
					className={styles.groupsHeader}
				>
					<div className={styles.groupsHeaderArrow}>
						{isExpandedFriends ? "▼" : "►"}
						<h3 className={styles.groupsHeaderText}>Friends</h3>
						<p className={styles.groupsHeaderCount}>
							({friendsOnlineList.length}){" "}
						</p>
					</div>
					{/* HERE COMPONENT TO ADD FRIENDS ? */}
				</div>
				{isExpandedFriends && (
					<ul className={styles.channelList}>
						{friendsOnlineList.map((friend) => (
							<li
								key={friend.username}
								className={`${styles.channelListItem} ${styles.channelListItemFriends}`}
								onClick={() =>
									switchChannel("@" + friend.username)
								}
							>
								<div
									className={
										styles.channelListItemIconAndUsername
									}
								>
									<img
										className={`${styles.channelListItemIcon} ${styles.channelListItemIconFriends}`}
										src={
											process.env.REACT_APP_NEST_URL +
											"/uploads/" +
											friend.username +
											".jpg"
										}
										alt="blnIcon"
									/>
									<p className={styles.channelListItemText}>
										{friend.username} -{" "}
										<span
											className={
												styles.channelListItemStatus
											}
										>
											{friend.status}
										</span>
									</p>
								</div>

								<ManageFriendDropdown
									username={friend.username}
									sendDeleteFriend={sendDeleteFriend}
									openProfile={openProfile}
									socketService={socketService}
								/>
							</li>
						))}
					</ul>
				)}
			</div>
			<div className={styles.groupsHeaderContainer}>
				<div
					onClick={toggleListOffline}
					className={styles.groupsHeader}
				>
					<div className={styles.groupsHeaderArrow}>
						{isExpandedOffline ? "▼" : "►"}
						<h3 className={styles.groupsHeaderText}>Offline</h3>
						<p className={styles.groupsHeaderCount}>
							({friendsOfflineList.length}){" "}
						</p>
					</div>
					{/* HERE COMPONENT TO ADD FRIENDS ? */}
				</div>
				{isExpandedOffline && (
					<ul className={styles.channelList}>
						{friendsOfflineList.map((friend) => (
							<li
								key={friend.username}
								className={`${styles.channelListItem} ${styles.channelListItemOffline}`}
							>
								<div
									className={
										styles.channelListItemIconAndUsername
									}
								>
									<img
										className={`${styles.channelListItemIcon} ${styles.channelListItemIconFriendsOffline}`}
										src={
											process.env.REACT_APP_NEST_URL +
											"/uploads/" +
											friend.username +
											".jpg"
										}
										alt="blnIcon"
									/>
									<p className={styles.channelListItemText}>
										{friend.username}
									</p>
								</div>
								<ManageFriendDropdown
									username={friend.username}
									sendDeleteFriend={sendDeleteFriend}
									openProfile={openProfile}
									socketService={socketService}
								/>
							</li>
						))}
					</ul>
				)}
			</div>
		</>
	);
};

const DropdownMenuChat: React.FC<{
	username: string;
	openProfile: (username: string) => void;
	sendFriendRequest: (username: string) => void;
	sendDeleteFriend: (username: string) => void;
	channelRoles: Array<{ username: string; role: string }>;
	socketService: SocketService;
	activeChannel: string;
	setPreventScroll: (preventScroll: boolean) => void;
}> = ({
	username,
	openProfile,
	sendFriendRequest,
	sendDeleteFriend,
	channelRoles,
	socketService,
	activeChannel,
	setPreventScroll,
}) => {
	const [blockList, setBlockList] = [
		useContext(GameContext).blockList,
		useContext(GameContext).setBlockList,
	];
	const [isExpanded, setIsExpanded] = useState(false);
	const [isHeBlocked, setIsHeBlocked] = useState<boolean>(false);
	const myUsername = useContext(GameContext).username;
	const dropdownMenuChatRef = useRef<HTMLDivElement | null>(null);
	const dropdownMenuChatContainertRef = useRef<HTMLDivElement | null>(null);
	const friend = useContext(GameContext).friends;
	const friendRequestsSent = useContext(GameContext).friendRequestsSent;
	const [isHePending, setIsHePending] = useState<boolean>(false);
	const [isManageDropdownOpen, setIsManageDropdownOpen] = useState(false);
	const [amIAdminOrOwner, setAmIAdminOrOwner] = useState(false);
	const [targetIsAdmin, setTargetIsAdmin] = useState(false);
	const [targetIsOwner, setTargetIsOwner] = useState(false);
	const [isMutedDropdownOpen, setIsMutedDropdownOpen] = useState(false);
	const gameInvitationSent = useContext(GameContext).gameInvitationSent;

	const resetDropdowns = () => {
		setIsMutedDropdownOpen(false);
		setIsManageDropdownOpen(false);
	};

	useEffect(() => {
		const userRoleObject = channelRoles.find(
			(roleObj) => roleObj.username === myUsername
		);
		if (
			userRoleObject &&
			(userRoleObject.role === "admin" || userRoleObject.role === "owner")
		) {
			setAmIAdminOrOwner(true);
		} else {
			setAmIAdminOrOwner(false);
		}

		const targetRoleObject = channelRoles.find(
			(roleObj) => roleObj.username === username
		);
		if (
			targetRoleObject &&
			(targetRoleObject.role === "admin" ||
				targetRoleObject.role === "owner")
		) {
			setTargetIsAdmin(true);
		} else {
			setTargetIsAdmin(false);
		}
		if (targetRoleObject && targetRoleObject.role === "owner") {
			setTargetIsOwner(true);
		} else {
			setTargetIsOwner(false);
		}
	}, [JSON.stringify(channelRoles), username]);

	const manageButton = (e: React.MouseEvent) => {
		e.stopPropagation();
		setIsManageDropdownOpen(!isManageDropdownOpen);
	};
	const muteButton = (e: React.MouseEvent) => {
		e.stopPropagation();
		setIsMutedDropdownOpen(!isMutedDropdownOpen);
	};
	const toggle = (e: React.MouseEvent) => {
		setIsExpanded(!isExpanded);
		setMousePosition({ x: e.clientX, y: e.clientY });
	};
	const [mousePosition, setMousePosition] = useState({
		x: 0,
		y: 0,
	});
	useEffect(() => {
		if (blockList.some((b) => b.username === username)) {
			setIsHeBlocked(true);
		} else {
			setIsHeBlocked(false);
		}
	}, [JSON.stringify(blockList)]);
	useEffect(() => {
		if (isExpanded) {
			setPreventScroll(true);
		} else {
			setPreventScroll(false);
			setIsMutedDropdownOpen(false);
			setIsManageDropdownOpen(false);
		}
	}, [isExpanded]);
	useEffect(() => {
		if (!dropdownMenuChatRef.current) return;
		if (isExpanded) {
			const parent =
				dropdownMenuChatRef.current.closest(".react-resizable");

			if (!parent) return;
			const parentRect = parent.getBoundingClientRect();
			const xRelativeToParent = mousePosition.x - parentRect.left;
			const yRelativeToParent = mousePosition.y - parentRect.top + 5;
			if (dropdownMenuChatRef.current) {
				dropdownMenuChatRef.current.style.position = "fixed";
				dropdownMenuChatRef.current.style.top = `${yRelativeToParent}px`;
				dropdownMenuChatRef.current.style.left = `5px`;
			}
		}
	}, [isExpanded]);
	useEffect(() => {
		const parent = document.getElementById("chatMessages");
		if (!parent) return;
		const handleScroll = () => {
			setIsExpanded(false);
		};
		parent.addEventListener("scroll", handleScroll);
		return () => {
			parent.removeEventListener("scroll", handleScroll);
		};
	}, []);

	useEffect(() => {
		if (friendRequestsSent.some((f) => f.username === username)) {
			setIsHePending(true);
		} else {
			setIsHePending(false);
		}
	}, [JSON.stringify(useContext(GameContext).friendRequestsSent)]);
	const handleClickOutside = (e: any) => {
		if (
			dropdownMenuChatContainertRef.current &&
			!dropdownMenuChatContainertRef.current.contains(e.target)
		) {
			setIsExpanded(false);
		}
	};
	const [isFriend, setIsFriend] = useState<boolean>(false);
	useEffect(() => {
		if (friend.some((f) => f.username === username)) {
			setIsFriend(true);
		} else {
			setIsFriend(false);
		}
	}, [JSON.stringify(useContext(GameContext).friends)]);
	useEffect(() => {
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const promoteAdmin = (username: string) => {
		socketService.emit("promoteAdmin", username);
	};
	const demoteAdmin = (username: string) => {
		socketService.emit("demoteAdmin", username);
	};
	const kickUser = (username: string) => {
		socketService.emit("kickUser", {
			usernameToKick: username,
			channelName: activeChannel,
		});
	};
	const muteUser = (username: string, muteDuration: number) => {
		socketService.emit("muteUser", {
			usernameToMute: username,
			muteDuration: muteDuration,
		});
	};

	const banUser = (username: string) => {
		socketService.emit("banUser", {
			usernameToBan: username,
			channelName: activeChannel,
		});
	};

	const inviteToGame = (username: string) => {
		socketService.sendGameInvitation(username);
	};

	return (
		<div
			ref={dropdownMenuChatContainertRef}
			className={styles.dropdownMenuChatContainer}
		>
			<strong
				className={
					username === "SERVER"
						? styles.chatMessageServer
						: username === myUsername
						? styles.myMessage
						: styles.chatMessageUserOther
				}
			>
				<p onClick={(e) => (username === "SERVER" ? null : toggle(e))}>
					{username}
				</p>
			</strong>
			{isExpanded && (
				<div className={styles.dropdownMenu} ref={dropdownMenuChatRef}>
					<button onClick={() => openProfile(username)}>
						Profile
					</button>
					{username !== myUsername && (
						<>
							<hr className={styles.dropdownMenuHr} />
							{isFriend ? (
								<button
									onClick={() => sendDeleteFriend(username)}
									className={styles.deleteFriend}
								>
									Unfriend
								</button>
							) : isHePending ? (
								<button
									disabled
									className={styles.disabledButton}
								>
									Request Sent...
								</button>
							) : (
								<button
									onClick={() => sendFriendRequest(username)}
								>
									Add Friend
								</button>
							)}
							<hr className={styles.dropdownMenuHr} />
							{gameInvitationSent ? (
								<button
									disabled
									className={styles.disabledButton}
								>
									Invitation Sent...
								</button>
							) : (
								<button onClick={() => inviteToGame(username)}>
									Invite to game
								</button>
							)}
							<hr className={styles.dropdownMenuHr} />
							{isHeBlocked ? (
								<button
									onClick={() => {
										setBlockList(
											blockList.filter(
												(b) => b.username !== username
											)
										);
									}}
								>
									Unblock
								</button>
							) : (
								<>
									<button
										onClick={() => {
											setBlockList([
												...blockList,
												{ username: username },
											]);
										}}
									>
										Block
									</button>
									<hr className={styles.dropdownMenuHr} />
								</>
							)}
							{amIAdminOrOwner && !targetIsOwner && (
								<div
									onMouseEnter={manageButton}
									onMouseLeave={() =>
										setIsManageDropdownOpen(false)
									}
									className={styles.manageDropdown}
								>
									<button
										style={{
											display: "flex",
											justifyContent: "space-between",
										}}
									>
										<span>Manage</span>
										<span>►</span>
									</button>

									{isManageDropdownOpen && (
										<div
											className={
												styles.nestedDropdownMenu
											}
										>
											{targetIsAdmin ? (
												<button
													className={
														styles.deleteFriend
													}
													onClick={() =>
														demoteAdmin(username)
													}
												>
													Revoke Admin
												</button>
											) : (
												<button
													onClick={() =>
														promoteAdmin(username)
													}
												>
													Make Admin
												</button>
											)}
											<button
												onClick={() =>
													kickUser(username)
												}
											>
												Kick
											</button>
											<button
												onClick={() =>
													banUser(username)
												}
											>
												Ban
											</button>
											<div
												onMouseEnter={muteButton}
												onMouseLeave={() =>
													setIsMutedDropdownOpen(
														false
													)
												}
												className={
													styles.manageDropdown
												}
											>
												<button
													style={{
														display: "flex",
														justifyContent:
															"space-between",
													}}
												>
													<span>Mute</span>
													<span>►</span>
												</button>
												{isMutedDropdownOpen && (
													<div
														className={
															styles.nestedDropdownMenu
														}
													>
														<button
															onClick={() =>
																muteUser(
																	username,
																	60
																)
															}
														>
															1 minute
														</button>
														<button
															onClick={() =>
																muteUser(
																	username,
																	300
																)
															}
														>
															5 minutes
														</button>
														<button
															onClick={() =>
																muteUser(
																	username,
																	900
																)
															}
														>
															15 minutes
														</button>
														<button
															onClick={() =>
																muteUser(
																	username,
																	3600
																)
															}
														>
															1 hour
														</button>
														<button
															onClick={() =>
																muteUser(
																	username,
																	86400
																)
															}
														>
															1 day
														</button>
														<button
															onClick={() =>
																muteUser(
																	username,
																	604800
																)
															}
														>
															1 week
														</button>
													</div>
												)}
											</div>
										</div>
									)}
								</div>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
};

const ManageServerButton: React.FC<{
	socketService: SocketService;
	activeChannel: string;
	activeChannelType: string;
	showUpdateChannelForm: boolean;
	setShowUpdateChannelForm: (showUpdateChannelForm: boolean) => void;
	showUpdatePasswordForm: boolean;
	setShowUpdatePasswordForm: (updatePasswordForm: boolean) => void;
	channelRoles: Array<{ username: string; role: string }>;
}> = ({
	socketService,
	activeChannel,
	activeChannelType,
	showUpdateChannelForm,
	setShowUpdateChannelForm,
	showUpdatePasswordForm,
	setShowUpdatePasswordForm,
	channelRoles,
}) => {
	const [isExpanded, setIsExpanded] = useState<boolean>(false);
	const manageServerButtonRef = useRef<HTMLDivElement | null>(null);

	const toggleList = () => {
		setIsExpanded(!isExpanded);
	};
	const showUpdateChannelFormButton = (e: React.FormEvent) => {
		e.preventDefault();
		setIsExpanded(false);
		setShowUpdateChannelForm(!showUpdateChannelForm);
		setShowUpdatePasswordForm(false);
	};
	const showUpdatePasswordFormButton = (e: React.FormEvent) => {
		e.preventDefault();
		setIsExpanded(false);
		setShowUpdatePasswordForm(!showUpdatePasswordForm);
		setShowUpdateChannelForm(false);
	};
	const handleClickOutside = (e: any) => {
		if (
			manageServerButtonRef.current &&
			!manageServerButtonRef.current.contains(e.target)
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
			className={styles.manageServerButtonContainer}
			ref={manageServerButtonRef}
		>
			<img
				className={styles.manageServerButton}
				src={GearIcon}
				alt="manageServerIcon"
				onClick={toggleList}
			/>
			{isExpanded && (
				<div className={styles.dropdownMenu}>
					<button onClick={(e) => showUpdateChannelFormButton(e)}>
						Change channel type
					</button>
					{activeChannelType === "password_protected" && (
						<button
							onClick={(e) => showUpdatePasswordFormButton(e)}
						>
							Change password
						</button>
					)}
				</div>
			)}
		</div>
	);
};

const ChatBox: React.FC<{
	socketService: SocketService;
	activeChannel: string;
	activeChannelType: string;
	chats: Record<string, Array<{ user: string; message: string }>>;
	onBack: () => void;
	friendQuote: string;
	sendFriendRequest: (username: string) => void;
	sendDeleteFriend: (username: string) => void;
	channelRoles: Array<{ username: string; role: string }>;
	openProfile: (username: string) => void;
	channelUpdateStatus: string | null;
}> = ({
	socketService,
	activeChannel,
	activeChannelType,
	chats,
	onBack,
	friendQuote,
	sendFriendRequest,
	sendDeleteFriend,
	channelRoles,
	openProfile,
	channelUpdateStatus,
}) => {
	const [message, setMessage] = useState<string>("");
	const [backAnim, setBackAnim] = useState<boolean>(false);
	const [backKey, setBackKey] = useState<number>(Date.now());
	const avatar = useContext(GameContext).avatar;
	const username = useContext(GameContext).username;
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const [isUserAtBottom, setIsUserAtBottom] = useState(true);
	const [newMessageCount, setNewMessageCount] = useState(0);
	const isPrivateChannel = activeChannel[0] === "@";
	const [preventScroll, setPreventScroll] = useState(false);
	const [amIOwner, setAmIOwner] = useState(false);
	const [newChannelType, setNewChannelType] = useState<string>("public");
	const channelTypeOptions = ["public", "private", "password_protected"];
	const [newPassword, setNewPassword] = useState<string>("");
	const [showUpdateChannelForm, setShowUpdateChannelForm] = useState(false);
	const [showUpdatePasswordForm, setShowUpdatePasswordForm] = useState(false);
	const [updateError, setUpdateError] = useState<string>("");
	const channelTypeSelectRef = useRef<HTMLSelectElement>(null);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const selectedChannelType = channelTypeSelectRef.current
			? channelTypeSelectRef.current.value
			: null;

		const payload = {
			channelName: activeChannel,
			channelType: selectedChannelType,
			password: newPassword,
		};
		socketService.emit("updateChannel", payload);
		setNewPassword("");
	};

	useEffect(() => {
		if (channelUpdateStatus === "success") {
			setShowUpdateChannelForm(false);
			setShowUpdatePasswordForm(false);
			const selectedChannelType = channelTypeSelectRef.current
				? channelTypeSelectRef.current.value
				: "public";
			setNewChannelType(selectedChannelType);
		} else if (channelUpdateStatus !== "" && channelUpdateStatus !== null) {
			setUpdateError(channelUpdateStatus);
			setTimeout(() => {
				setUpdateError("");
			}, 3000);
		}
	}, [channelUpdateStatus]);
	useEffect(() => {
		const userRoleObject = channelRoles.find(
			(roleObj) => roleObj.username === username
		);
		if (userRoleObject && userRoleObject.role === "owner") {
			setAmIOwner(true);
		} else {
			setAmIOwner(false);
		}
	}, [JSON.stringify(channelRoles), username]);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "nearest",
		});
	};
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const element = messagesContainerRef.current;
		if (element) {
			setTimeout(() => {
				element.scrollTop = element.scrollHeight;
			}, 100);
		}
	}, [messagesContainerRef]);

	useEffect(() => {
		const element = messagesContainerRef.current;
		if (!element) return;

		const handleScroll = () => {
			const distanceToBottom =
				element.scrollHeight -
				(element.scrollTop + element.clientHeight);
			setIsUserAtBottom(distanceToBottom < 20);
		};

		element.addEventListener("scroll", handleScroll);

		return () => {
			element.removeEventListener("scroll", handleScroll);
		};
	}, []);

	useEffect(() => {
		if (isUserAtBottom) {
			setNewMessageCount(0);
		}
	}, [isUserAtBottom, preventScroll]);
	// useEffect(() => {
	// 	const element = messagesContainerRef.current;
	// 	if (isUserAtBottom) {
	// 		scrollToBottom();
	// 	}
	// 	if (!element) return;
	// 	if (isUserAtBottom) {
	// 		scrollToBottom();
	// 	} else if (chats[activeChannel] && chats[activeChannel].length > 0) {
	// 		if (newMessageCount <= 99) {
	// 			setNewMessageCount((prevCount) => prevCount + 1);
	// 		}
	// 	}
	// }, [chats[activeChannel]]);
	useEffect(() => {
		if (isUserAtBottom && !preventScroll) {
			const element = messagesContainerRef.current;
			if (element) {
				window.requestAnimationFrame(() => {
					element.scrollTop = element.scrollHeight;
				});
			}
		}
	}, [isUserAtBottom, chats[activeChannel], preventScroll]);

	useEffect(() => {
		if (
			(!isUserAtBottom || preventScroll) &&
			chats[activeChannel] &&
			chats[activeChannel].length > 0
		) {
			if (newMessageCount <= 99) {
				setNewMessageCount((prevCount) => prevCount + 1);
			}
		}
	}, [chats[activeChannel]]);

	const sendMessage = (e: React.FormEvent) => {
		e.preventDefault();
		socketService.sendMessage(message);
		setMessage("");
		setTimeout(() => {
			handleInput();
		}, 100);
	};

	const onBackAnimation = () => {
		setBackAnim(true);
		setBackKey(Date.now());
		setTimeout(() => {
			onBack();
			setBackAnim(false);
		}, 250);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage(e);
		}
	};
	const handleInput = () => {
		// console.log("handleInput");
		const textarea = textareaRef.current;
		if (!textarea) return;
		textarea.style.height = "auto";
		const newHeight = Math.min(textarea.scrollHeight, 100);
		textarea.style.height = `${newHeight}px`;
	};

	const renderGroupedMessages = (
		messages: any,
		username: any,
		styles: any
	) => {
		let elements: any = [];
		let lastUser: any = null;
		let group: any = [];
		let groupIndex = 0;
		//TODO: retirer tout les any
		messages.forEach((chatMessage: any, index: any) => {
			const isNewUser = lastUser !== chatMessage.user;

			if (isNewUser && group.length > 0) {
				elements.push(
					<div
						key={"group-" + lastUser + "-" + groupIndex}
						className={styles.messageGroup}
					>
						{group}
					</div>
				);
				group = [];
				groupIndex++;
			}

			if (isNewUser) {
				group.push(
					<div key={"user-" + index} className={styles.chatUser}>
						<DropdownMenuChat
							username={chatMessage.user}
							openProfile={openProfile}
							sendFriendRequest={sendFriendRequest}
							sendDeleteFriend={sendDeleteFriend}
							channelRoles={channelRoles}
							socketService={socketService}
							activeChannel={activeChannel}
							setPreventScroll={setPreventScroll}
						/>
					</div>
				);
				lastUser = chatMessage.user;
			}

			group.push(
				<div className={styles.chatMessage} key={"message-" + index}>
					<p className={styles.chatMessageP}>{chatMessage.message}</p>
				</div>
			);
		});
		if (group.length > 0) {
			elements.push(
				<div
					key={"group-" + lastUser + "-" + groupIndex}
					className={styles.messageGroup}
				>
					{group}
				</div>
			);
		}
		elements.push(
			<div ref={messagesEndRef} key={"messagesEnd" + Date.now()}></div>
		);
		return elements;
	};

	useEffect(() => {
		const textarea = textareaRef.current;
		if (textarea) {
			textarea.addEventListener("input", handleInput);
			textarea.style.height = "60px";
		}
		return () => {
			if (textarea) {
				textarea.removeEventListener("input", handleInput);
			}
		};
	}, []);

	useEffect(() => {
		const textarea = textareaRef.current;
		if (textarea) {
			const resizeObserver = new ResizeObserver(() => {
				// Utilisation de requestAnimationFrame pour décaler la mise à jour
				window.requestAnimationFrame(() => {
					handleInput();
				});
			});
			resizeObserver.observe(textarea);
			return () => {
				resizeObserver.disconnect();
			};
		}
	}, []);

	return (
		<div
			key={backKey}
			className={`${styles.chatBox} ${backAnim ? styles.backAnim : ""}`}
		>
			<div className={styles.headerChat}>
				<button
					className={styles.headerChatButton}
					onClick={onBackAnimation}
				>
					←
				</button>
				{isPrivateChannel ? (
					<img
						className={styles.headerChatIcon}
						src={
							process.env.REACT_APP_NEST_URL +
							"/uploads/" +
							activeChannel.slice(1) +
							".jpg"
						}
						alt="blnIcon"
					/>
				) : (
					<img
						className={styles.headerChatIcon}
						src={BlnIcon}
						alt="blnIcon"
					/>
				)}

				<div className={styles.headerChatTextContainer}>
					{isPrivateChannel ? (
						<h2 className={styles.chatName}>
							{activeChannel.slice(1)}
						</h2>
					) : (
						<h2 className={styles.chatName}>{activeChannel}</h2>
					)}
					{isPrivateChannel && friendQuote !== "" && (
						<h3 className={styles.chatQuote}>{friendQuote}</h3>
					)}
				</div>
				{!isPrivateChannel && amIOwner && (
					<ManageServerButton
						socketService={socketService}
						activeChannel={activeChannel}
						activeChannelType={activeChannelType}
						showUpdateChannelForm={showUpdateChannelForm}
						setShowUpdateChannelForm={setShowUpdateChannelForm}
						showUpdatePasswordForm={showUpdatePasswordForm}
						setShowUpdatePasswordForm={setShowUpdatePasswordForm}
						channelRoles={channelRoles}
					/>
				)}
			</div>
			{showUpdateChannelForm && (
				<>
					<form
						onSubmit={handleSubmit}
						className={styles.updateChannelForm}
					>
						<select
							className={styles.createChannelSelect}
							value={newChannelType}
							onChange={(e) => setNewChannelType(e.target.value)}
							ref={channelTypeSelectRef}
						>
							{channelTypeOptions
								.filter(
									(option) => option !== activeChannelType
								)
								.map((option) => (
									<option key={option} value={option}>
										{option.charAt(0).toUpperCase() +
											option.slice(1)}
									</option>
								))}
						</select>
						{newChannelType === "password_protected" && (
							<input
								value={newPassword}
								className={styles.joinChannelPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								placeholder="Password"
								type="password"
								required
							/>
						)}
						<button className={styles.stepButton} type="submit">
							→
						</button>
					</form>
					{updateError && (
						<p className={styles.errorTextStatus}>{updateError}</p>
					)}
				</>
			)}
			{showUpdatePasswordForm && (
				<>
					<form
						onSubmit={handleSubmit}
						className={styles.updateChannelForm}
					>
						<input
							value={newPassword}
							className={styles.joinChannelPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							placeholder="Password"
							type="password"
							required
						/>
						<button className={styles.stepButton} type="submit">
							→
						</button>
					</form>
					{updateError && (
						<p className={styles.errorTextStatus}>{updateError}</p>
					)}
				</>
			)}
			<div
				className={styles.chatMessages}
				ref={messagesContainerRef}
				id="chatMessages"
			>
				{renderGroupedMessages(
					chats[activeChannel] || [],
					username,
					styles
				)}
				{(!isUserAtBottom || preventScroll) && newMessageCount > 0 && (
					<div
						className={styles.scrollToBottomArrow}
						onClick={scrollToBottom}
					>
						<span>
							↓{newMessageCount > 99 ? "99+" : newMessageCount}
						</span>
					</div>
				)}
			</div>

			<form onSubmit={sendMessage} className={styles.formChat}>
				<img className={styles.chatAvatar} src={avatar} alt="avatar" />
				<textarea
					ref={textareaRef}
					className={styles.chatInput}
					rows={1}
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Type a message"
					style={{
						resize: "none",
						overflowY: "auto",
						maxHeight: "100px",
					}}
				/>
				<button className={styles.formButton} type="submit">
					»
				</button>
			</form>
		</div>
	);
};

const ChangeQuote: React.FC<{
	socketService: SocketService;
	currentQuote: string;
	quote: string;
	setQuote: (quote: string) => void;
	setQuoteError: (error: string | null) => void;
}> = ({ socketService, currentQuote, quote, setQuote, setQuoteError }) => {
	const handleUpdateQuote = () => {
		if (quote.trim() !== "") {
			socketService.updateUserQuote(quote);
		}
	};

	return (
		<div className={styles.changeQuoteContainer}>
			<textarea
				className={styles.headerQuote}
				rows={2}
				maxLength={30}
				value={quote}
				spellCheck={false}
				onChange={(e) => setQuote(e.target.value)}
				onFocus={() => setQuoteError(null)}
				placeholder={
					currentQuote ? currentQuote : "Click here to change quote"
				}
				onBlur={handleUpdateQuote}
			/>
		</div>
	);
};

const BLN: React.FC<{ argument?: string }> = ({ argument: initialChannel }) => {
	//TODO: Acutellement on a les etats de creation de channel mais pas de join ou on a que les erreur mais pas les succe ou alors les "deja join", il faut l'intgerer et le mettre en place pour pouvoir fermer le menu en fonction
	const socketService = SocketService.getInstance();
	const [chats, setChats] = useState<
		Record<string, Array<{ user: string; message: string }>>
	>({});
	const [joinedChannels, setJoinedChannels] = useState<string[]>([]);
	const [channelName, setChannelName] = useState<string>("");
	const [activeChannel, setActiveChannel] = useState<string>("");
	const [activeChannelType, setActiveChannelType] = useState<string>("");
	const [channelUpdateError, setChannelUpdateError] = useState<string | null>(
		null
	);
	const [error, setError] = useState<string | null>(null);
	const [quoteError, setQuoteError] = useState<string | null>(null);
	const [channelPassword, setChannelPassword] = useState<string>("");
	const setBlnClosed = useContext(GameContext).setBlnClosed;
	const [isPasswordRequired, setIsPasswordRequired] =
		useState<boolean>(false);
	const [channelCreationStatus, setChannelCreationStatus] =
		useState<string>("");
	const [showChatBox, setShowChatBox] = useState<boolean>(!!initialChannel);
	const [friends, setFriends] = [
		useContext(GameContext).friends,
		useContext(GameContext).setFriends,
	];
	const [friendRequests, setFriendRequests] = useState<
		{ username: string; message: string }[]
	>([]);
	const [gameInvitations, setGameInvitations] = useState<
		{ username: string }[]
	>([]);
	const [friendRequestsSent, setFriendRequestsSent] = [
		useContext(GameContext).friendRequestsSent,
		useContext(GameContext).setFriendRequestsSent,
	];
	const avatar = useContext(GameContext).avatar;
	const username = useContext(GameContext).username;
	const [chatAnim, setChatAnim] = useState<boolean>(false);
	const [backAnim, setBackAnim] = useState<boolean>(false);
	const [quote, setQuote] = useState("");
	const [currentQuote, setCurrentQuote] = useState("");
	const [menuAction, setMenuAction] = useState<string | null>(null);
	const currentActiveChannel = useRef(activeChannel);
	const [friendQuote, setFriendQuote] = useState("");
	const blockList = useContext(GameContext).blockList;
	const [channelRoles, setChannelRoles] = useState<
		{ username: string; role: string }[]
	>([]);
	const setWantedUsername = React.useContext(GameContext).setWantedUsername;
	const openNewWindow = useContext(GameContext).openNewWindow;
	const [channelUpdateStatus, setChannelUpdateStatus] = useState<
		string | null
	>(null);
	const [gameInvitationSent, setGameInvitationSent] = [
		useContext(GameContext).gameInvitationSent,
		useContext(GameContext).setGameInvitationSent,
	];
	const showPopup = useContext(GameContext).showPopup;

	const openProfile = (username: string) => {
		setWantedUsername(username);
		openNewWindow("Profile.xls", null, username);
	};

	useEffect(() => {
		const friendUsernames = new Set(
			friends.map((friend) => friend.username)
		);

		const newFriendRequests = friendRequests.filter(
			(request) => !friendUsernames.has(request.username)
		);

		setFriendRequests(newFriendRequests);
	}, [JSON.stringify(friendRequests), JSON.stringify(friends)]);

	// useEffect(() => {
	// 	console.log("channelRoles:", channelRoles);
	// }, [JSON.stringify(channelRoles)]);
	useEffect(() => {
		// console.log(
		// 	"showChatBox:",
		// 	showChatBox,
		// 	"initialChannel:",
		// 	initialChannel
		// );
		if (initialChannel) {
			// console.log("Initial channel:", initialChannel);
			switchToChat(initialChannel);
		}
	}, []);
	useEffect(() => {
		currentActiveChannel.current = activeChannel;
	}, [activeChannel]);
	useEffect(() => {
		if (!showChatBox) {
			setActiveChannel("");
		}
	}, [showChatBox]);
	useEffect(() => {
		socketService.updateBlockList(blockList);
	}, [blockList]);

	const switchToChannelsList = () => {
		setBackAnim(true);
		setShowChatBox(false);
		setTimeout(() => {
			setBackAnim(false);
		}, 250);
	};

	const switchToChat = (channel: string) => {
		setChatAnim(true);
		setTimeout(() => {
			setChatAnim(false);
			switchChannel(channel);
			setShowChatBox(true);
		}, 250);
	};

	// useEffect(() => {
	// 	console.log("friendRequests sent:", friendRequestsSent);
	// }, [JSON.stringify(friendRequestsSent)]);
	const handleUserBanned = (username: string, channelId: number) => {
		// console.log("User banned:", username);
	};

	const handleUserKicked = (username: string, channelId: number) => {
		// console.log(`User ${username} kicked from channel ID: ${channelId}`);
	};

	const handleUserMuted = (username: string, duration: number) => {
		// console.log(`User ${username} muted for ${duration} minutes`);
	};
	useEffect(() => {
		setBlnClosed(false);
		socketService.setBlnClosed(false);
		socketService.emit("InitBLN", {});

		const storedChats = socketService.getFromSessionStorage("chats");
		if (storedChats) {
			setChats(storedChats);
		}

		const storedChannels =
			socketService.getFromSessionStorage("joinedChannels");
		if (storedChannels) {
			setJoinedChannels(storedChannels);
		}

		const storedQuote = socketService.getFromSessionStorage("userQuote");
		if (storedQuote) {
			setCurrentQuote(storedQuote);
		}
		socketService.listenToFriendshipsRetrieved(
			(retrievedFriends: { username: string; status: string }[]) => {
				setFriends(retrievedFriends);
			}
		);
		socketService.listenToQuoteRetrieved((quote) => {
			setCurrentQuote(quote);
		});

		socketService.listenToStatusUpdate(
			(retrievedFriend: { username: string; status: string }) => {
				setFriends((prevFriends) => {
					const updatedFriends = [...prevFriends];
					const existingFriendIndex = updatedFriends.findIndex(
						(friend) => friend.username === retrievedFriend.username
					);

					if (existingFriendIndex !== -1) {
						updatedFriends[existingFriendIndex] = retrievedFriend;
					} else {
						updatedFriends.push(retrievedFriend);
					}

					return updatedFriends;
				});
			}
		);

		socketService.listenToChannelsRetrieved((channels) => {
			const channelNames = channels.map((channel) => channel.name);
			setJoinedChannels(channelNames);
			setActiveChannel(channelNames[0] || "");
			setError(null);
			setChannelName("");
			setChannelPassword("");
			setIsPasswordRequired(false);
			channels.forEach((channel) => {
				socketService.listenToMessages(
					channel.id,
					channel.name,
					({ user, message }) => {
						setChats((prevChats) => ({
							...prevChats,
							[channel.name]: [
								...(prevChats[channel.name] || []),
								{ user, message },
							],
						}));
					}
				);
			});
		});

		const handlePendingFriendRequests = ({ from, sent }: FriendRequest) => {
			const formattedRequests = from.map((req: any) => {
				return {
					username: req.username,
					message: req.message || "Would you like to be friends?",
				};
			});
			const formattedRequestsSent = sent.map((req: any) => {
				return {
					username: req.username,
				};
			});
			setFriendRequests(formattedRequests);
			setFriendRequestsSent(formattedRequestsSent);
		};

		const handleFriendRequestSent = (username: string) => {
			setFriendRequestsSent((prev) => [...prev, { username }]);
		};

		const updateOrAddChannelRole = (data: {
			username: string;
			role: string;
		}) => {
			setChannelRoles((prevChannelRoles) => {
				const existingUserIndex = prevChannelRoles.findIndex(
					(userRole) => userRole.username === data.username
				);

				// Clone le tableau pour éviter de muter le state directement
				const updatedChannelRoles = [...prevChannelRoles];

				if (existingUserIndex !== -1) {
					// Mettre à jour le role de l'utilisateur existant
					updatedChannelRoles[existingUserIndex].role = data.role;
				} else {
					// Ajouter le nouvel utilisateur et son role
					updatedChannelRoles.push({
						username: data.username,
						role: data.role,
					});
				}

				return updatedChannelRoles;
			});
		};

		const handleFriendRequest = (username: string) => {
			const message = "Would you like to be friends?";

			// Au lieu de montrer le window.confirm, ajoutez la demande à votre état local
			setFriendRequests((prev) => [...prev, { username, message }]);
		};

		const handleFriendAccepted = (username: string, status: string) => {
			setFriends((prevFriends) => [...prevFriends, { username, status }]);
			setFriendRequestsSent((prev) =>
				prev.filter((req) => req.username !== username)
			);
		};

		const handleFriendDeleted = (username: string) => {
			// console.log("active channel:", currentActiveChannel.current);
			// console.log("username:", username);
			setFriends((prevFriends) =>
				prevFriends.filter((friend) => friend.username !== username)
			);
			if (currentActiveChannel.current === "@" + username) {
				switchToChannelsList();
			}
		};

		const handleFriendRejected = (username: string) => {
			setFriendRequestsSent((prev) =>
				prev.filter((req) => req.username !== username)
			);
		};
		const listenToJoinedChannel = (
			channelName: string,
			channelId: number
		) => {
			setActiveChannel(channelName);
			setError(null);
			setChannelName("");
			setChannelPassword("");
			setIsPasswordRequired(false);
			if (!joinedChannels.includes(channelName)) {
				setJoinedChannels((prevJoined) => [...prevJoined, channelName]);
			}
			socketService.listenToMessages(
				channelId,
				channelName,
				({ user, message }) => {
					setChats((prevChats) => ({
						...prevChats,
						[channelName]: [
							...(prevChats[channelName] || []),
							{ user, message },
						],
					}));
				}
			);
		};

		const listenToKickedFromChannel = (channelName: string) => {
			setChannelRoles([]);
			setJoinedChannels((prevJoined) =>
				prevJoined.filter((channel) => channel !== channelName)
			);
		};

		const listenToBannedFromChannel = (channelName: string) => {
			setChannelRoles([]);
			setJoinedChannels((prevJoined) =>
				prevJoined.filter((channel) => channel !== channelName)
			);
		};

		const listentoUserJoinedChannel = (data: {
			username: string;
			role: string;
		}) => {
			// console.log("User joined channel:", data.username);
			updateOrAddChannelRole(data);
		};

		const listenToChannelUpdated = (
			channelName: string,
			channelType: string
		) => {
			// console.log("Channel updated:", channelName, "type:", channelType);
			setActiveChannelType(channelType);
			setChannelUpdateStatus(null);
			setTimeout(() => {
				setChannelUpdateStatus(`success`);
			}, 10);
		};

		const listenToChannelUpdateError = (errorMsg: string) => {
			// console.log("Channel update error:", errorMsg);
			setChannelUpdateError(errorMsg);
			setChannelUpdateStatus(null);
			setTimeout(() => {
				setChannelUpdateStatus(`Error: ${errorMsg}`);
			}, 10);
		};

		const listenToSwitchedChannel = (
			channelName: string,
			channelId: number,
			usersWithRoles: { username: string; role: string }[],
			channelType: string
		) => {
			// console.log(
			// 	"Channel switched to:",
			// 	channelName,
			// 	"id:",
			// 	channelId,
			// 	"usersWithRoles:",
			// 	usersWithRoles,
			// 	"channelType:",
			// 	channelType
			// );
			setActiveChannel(channelName);
			setActiveChannelType(channelType);
			setError(null);
			setChannelPassword("");
			setIsPasswordRequired(false);
			setChannelRoles(usersWithRoles);
			socketService.listenToMessages(
				channelId,
				channelName,
				({ user, message }) => {
					setChats((prevChats) => ({
						...prevChats,
						[channelName]: [
							...(prevChats[channelName] || []),
							{ user, message },
						],
					}));
				}
			);
		};

		const listenTogameInviteSent = (username: string) => {
			setGameInvitationSent(username);
			openNewWindow("Pong.exe", null);
		};
		const listenToGameInviteCanceled = (
			data?: string | { username: string }
		) => {
			if (typeof data === "string") {
				setGameInvitations((prev) =>
					prev.filter((invitation) => invitation.username !== data)
				);
			} else if (data && typeof data === "object" && data.username) {
				setGameInvitations((prev) =>
					prev.filter(
						(invitation) => invitation.username !== data.username
					)
				);
			} else {
				setGameInvitationSent("");
			}
		};

		const listenToGameInviteReceived = (username: string) => {
			setGameInvitations((prev) => {
				const isAlreadyPresent = prev.some(
					(invitation) => invitation.username === username
				);

				if (!isAlreadyPresent) {
					return [...prev, { username }];
				}

				return prev;
			});
		};
		const listenToPongGameRequestError = (errorMsg: string) => {
			// console.log("Pong game request error:", errorMsg);
			showPopup(errorMsg);
		};
		const listenToGameInviteAccepted = (username: string) => {
			setGameInvitations((prev) => {
				return prev.filter((invitation) => {
					return invitation.username !== username;
				});
			});
			openNewWindow("Pong.exe", null);
		};

		socketService.listenToChannelUpdated(listenToChannelUpdated);
		socketService.listenToChannelUpdateError(listenToChannelUpdateError);
		socketService.listenToUpdateRole(updateOrAddChannelRole);
		socketService.listenToKickedFromChannel(listenToKickedFromChannel);
		socketService.listenToBannedFromChannel(listenToBannedFromChannel);
		socketService.listenToFriendRequestSent(handleFriendRequestSent);
		socketService.getPendingFriendRequests();
		socketService.listenToFriendRequest(handleFriendRequest);
		socketService.listenToFriendAccepted(handleFriendAccepted);
		socketService.listenToFriendRejected(handleFriendRejected);
		socketService.listenToFriendDeleted(handleFriendDeleted);
		socketService.listenToSwitchedChannel(listenToSwitchedChannel);
		socketService.listenToJoinedChannel(listenToJoinedChannel);
		socketService.listentoUserJoinedChannel(listentoUserJoinedChannel);
		socketService.listenTogameInviteSent(listenTogameInviteSent);
		socketService.listenToGameInviteAccepted(listenToGameInviteAccepted);
		socketService.listenToPongGameRequestError(
			listenToPongGameRequestError
		);
		socketService.listenToGameInviteCanceled(listenToGameInviteCanceled);
		socketService.listenToGameInviteReceived(listenToGameInviteReceived);
		socketService.listenToFriendRequestAcceptedNotification(
			handleFriendAccepted
		);
		socketService.listenToUserBanned(handleUserBanned);
		socketService.listenToUserKicked(handleUserKicked);
		socketService.listenToUserMuted(handleUserMuted);
		socketService.listenToFriendRequestRejectedNotification(
			handleFriendRejected
		);
		socketService.listenToPendingFriendRequests(
			handlePendingFriendRequests
		);

		socketService.listenToQuoteUpdated((quote) => {
			setCurrentQuote(quote);
		});
		socketService.listenToQuoteUpdateError((errorMsg) => {
			setQuoteError(errorMsg);
		});

		socketService.listenToSwitchedToPrivate((data) => {
			// console.log("Private channel switched to:", data.channelName);
			setActiveChannel(data.channelName);
			setError(null);
			setChannelPassword("");
			setIsPasswordRequired(false);
			setFriendQuote(data.friendQuote);
		});

		socketService.listenToPM(({ user, message, channelName }) => {
			setChats((prevChats) => ({
				...prevChats,
				[channelName]: [
					...(prevChats[channelName] || []),
					{ user, message },
				],
			}));
		});

		socketService.listenToChannelNotFound(() => {
			setError("Channel not found");
		});

		socketService.listenToChannelCreated((channel) => {
			setChannelCreationStatus(
				`Channel ${channel.name} has been created!`
			);
		});

		socketService.listenToChannelAccessError((errorMsg) => {
			setError(errorMsg);
		});

		socketService.listenToPasswordRequired((errorMsg) => {
			setIsPasswordRequired(true);
			setError(errorMsg);
		});

		socketService.listenToChannelCreationError((error) => {
			setChannelCreationStatus(`Error: ${error}`);
		});

		return () => {
			setBlnClosed(true);
			socketService.setBlnClosed(true);
		};
	}, []);

	useEffect(() => {
		sessionStorage.setItem("chats", JSON.stringify(chats));
	}, [chats]);

	useEffect(() => {
		sessionStorage.setItem(
			"joinedChannels",
			JSON.stringify(joinedChannels)
		);
	}, [joinedChannels]);

	useEffect(() => {
		sessionStorage.setItem("activeChannel", JSON.stringify(activeChannel));
	}, [activeChannel]);

	useEffect(() => {
		sessionStorage.setItem("userQuote", JSON.stringify(currentQuote));
	}, [currentQuote]);

	const switchChannel = (channel: string) => {
		socketService.switchChannel(channel);
	};

	const joinChannelByName = (e: React.FormEvent) => {
		e.preventDefault();
		setIsPasswordRequired(false);
		socketService.joinChannelByName(channelName, channelPassword);
	};

	const handleChannelPasswordChange = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const password = e.target.value;
		setChannelPassword(password);
	};

	const handleAccept = (username: string) => {
		socketService.acceptFriendRequest(username);
		// Retirez la demande d'ami de l'état local
		setFriendRequests((prev) =>
			prev.filter((request) => request.username !== username)
		);
	};

	const handleReject = (username: string) => {
		socketService.rejectFriendRequest(username);
		// Retirez la demande d'ami de l'état local
		setFriendRequests((prev) =>
			prev.filter((request) => request.username !== username)
		);
	};

	const handleAcceptGame = (username: string) => {
		// openNewWindow("Pong.exe", null);
		socketService.acceptGameInvitation(username);
		// Retirez la demande d'ami de l'état local
		// setGameInvitations((prev) =>
		// 	prev.filter((invitation) => invitation.username !== username)
		// );
	};

	const handleRejectGame = (username: string) => {
		socketService.rejectGameInvitation(username);
		// Retirez la demande d'ami de l'état local
		// setGameInvitations((prev) =>
		// 	prev.filter((invitation) => invitation.username !== username)
		// );
	};

	const sendFriendRequest = (username: string) => {
		socketService.sendFriendRequest(username);
	};

	const sendDeleteFriend = (username: string) => {
		socketService.sendDeleteFriend(username);
	};

	const sendLeaveChannel = (channelName: string) => {
		socketService.leaveChannel(channelName);
	};

	return (
		<div className={styles.BLN}>
			{showChatBox ? (
				<ChatBox
					socketService={socketService}
					activeChannel={activeChannel}
					activeChannelType={activeChannelType}
					chats={chats}
					onBack={switchToChannelsList}
					friendQuote={friendQuote}
					sendFriendRequest={sendFriendRequest}
					sendDeleteFriend={sendDeleteFriend}
					channelRoles={channelRoles}
					openProfile={openProfile}
					channelUpdateStatus={channelUpdateStatus}
				/>
			) : (
				<div
					className={`${styles.home} ${
						chatAnim ? styles.chatAnim : ""
					} ${backAnim ? styles.backHomeAnim : ""}`}
				>
					<div className={styles.headerBackground}>
						<div className={styles.header}>
							<img
								className={styles.headerAvatar}
								src={avatar}
								alt="avatar"
							/>
							<div className={styles.headerTextContainer}>
								<div
									className={styles.headerUsernameAndRequests}
								>
									<h2 className={styles.usernameHeader}>
										{username}
									</h2>
									<div className={styles.requestsContainer}>
										<BLNFriendRequests
											requests={friendRequests}
											handleAccept={handleAccept}
											handleReject={handleReject}
										/>
										{/* <img
											src={ControllerIcon}
											alt="blnIcon"
											className={
												styles.gameRequestsButton
											}
										/> */}
										<GameInvitations
											invitations={gameInvitations}
											handleAccept={handleAcceptGame}
											handleReject={handleRejectGame}
										/>
									</div>
								</div>
								<ChangeQuote
									socketService={socketService}
									currentQuote={currentQuote}
									quote={quote}
									setQuote={setQuote}
									setQuoteError={setQuoteError}
								/>
								{/* <FriendsRequestsButton /> */}
							</div>
						</div>
					</div>
					{quoteError && (
						<p className={styles.quoteError}>{quoteError}</p>
					)}
					<hr className={styles.divider} />

					{menuAction === "create" && (
						<CreateChannel
							socketService={socketService}
							channelCreationStatus={channelCreationStatus}
							setChannelCreationStatus={setChannelCreationStatus}
							setMenuAction={setMenuAction}
						/>
					)}
					{menuAction === "join" && (
						<JoinChannelForm
							joinChannelByName={joinChannelByName}
							channelName={channelName}
							setChannelName={setChannelName}
							isPasswordRequired={isPasswordRequired}
							channelPassword={channelPassword}
							handleChannelPasswordChange={
								handleChannelPasswordChange
							}
							error={error}
						/>
					)}
					<div className={styles.list}>
						<ChannelList
							joinedChannels={joinedChannels}
							switchChannel={switchToChat}
							menuAction={menuAction}
							setMenuAction={setMenuAction}
							friends={friends}
							sendDeleteFriend={sendDeleteFriend}
							sendLeaveChannel={sendLeaveChannel}
							openProfile={openProfile}
							socketService={socketService}
						/>
					</div>
				</div>
			)}
		</div>
	);
};

export default BLN;
