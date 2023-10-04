import React, {
	useEffect,
	useRef,
	useState,
	createContext,
	useContext,
	cloneElement,
} from "react";
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import styles from "../assets/styles/App.module.css";
import Pong from "../components/Pong";
import BLN from "../components/BLN";
import TwoFA from "../components/TwoFA";
import Register from "../pages/Register";
import PongLeave from "../components/PongLeave";
import MusicPlayer from "../components/MusicPlayer";
import { animated, useSpring, useTransition } from "react-spring";
import Profile from "../components/Profile";
import createPongSocket from "../pongSocket";
import ChatNotifications from "../components/ChatNotifications";
import SocketService from "../services/BLNSocketService";
import fetchProtect from "../services/fetchProtect";
import { useNavigate, useLocation } from "react-router-dom";
import BLNInit from "../components/BLNInit";
import Popup from "../components/Popup";

//ICON IMPORT
import PongIcon from "../assets/images/pongIcon.svg";
import BlnIcon from "../assets/images/blnIcon.svg";
import LockIcon from "../assets/images/lock.svg";
import ProfileIcon from "../assets/images/profileIcon.svg";
import AvatarIcon from "../assets/images/avatarIconb.svg";
import MusicIcon from "../assets/images/walkman.svg";
import FullScreenIcon from "../assets/images/fullScreenIcon.png";
import Refresh from "../assets/images/refresh.png";
import RefreshIcon from "../assets/images/refreshIcon.png";
import HouseIcon from "../assets/images/houseIconb.svg";

export const GameContext = createContext({
	isInGame: false,
	setIsInGame: (inGame: boolean) => {},
	username: "",
	avatar: "",
	setAvatar: (avatar: string) => {},
	incrementResetWindowsNumber: () => {},
	setBlnClosed: (blnClosed: boolean) => {},
	blnClosed: true,
	notification: { username: "", message: "", channelName: "" },
	setNotification: (notification: ChatNotificationsProps) => {},
	friends: [] as Array<{ username: string; status: string }>,
	setFriends: (
		friends:
			| Array<{ username: string; status: string }>
			| ((
					prevFriends: Array<{ username: string; status: string }>
			  ) => Array<{ username: string; status: string }>)
	) => {},
	friendRequestsSent: [] as Array<{ username: string }>,
	setFriendRequestsSent: (
		friends:
			| Array<{ username: string }>
			| ((
					prevFriends: Array<{ username: string }>
			  ) => Array<{ username: string }>)
	) => {},
	openNewWindow: (
		content: string,
		targetElement: HTMLElement | null,
		argument?: any
	) => {},
	wantedUsername: "",
	setWantedUsername: (username: string) => {},
	setShowRegisterModal: (show: boolean) => {},
	blockList: [] as Array<{ username: string }>,
	setBlockList: (
		blockList:
			| Array<{ username: string }>
			| ((
					prevBlockList: Array<{ username: string }>
			  ) => Array<{ username: string }>)
	) => {},

	gameInvitationSent: "",
	setGameInvitationSent: (username: string) => {},
	showPopup: (message: string) => {},
});

type ChatNotificationsProps = {
	message: string;
	username: string;
	channelName: string;
};

type PopupData = {
	message: string;
	x: number;
	y: number;
};

interface Window {
	id: number;
	content: string;
	position: { x: number; y: number };
	argument?: any;
}

interface Application {
	icon: string;
	iconShow: boolean;
	WindowContent: React.FC<any>;
	defaultWidth: number;
	defaultHeight: number;
	minWidth: number;
	minHeight: number;
	maxWidth?: number;
	maxHeight?: number;
}

const applications: { [key: string]: Application } = {
	"2FA.exe": {
		icon: LockIcon,
		iconShow: true,
		WindowContent: TwoFA,
		defaultWidth: 260,
		defaultHeight: 350,
		minWidth: 250,
		minHeight: 335,
	},
	"Pong.exe": {
		icon: PongIcon,
		iconShow: true,
		WindowContent: Pong,
		defaultWidth: 670,
		defaultHeight: 540,
		minWidth: 490,
		minHeight: 400,
	},
	"Profile.xls": {
		icon: ProfileIcon,
		iconShow: true,
		WindowContent: Profile,
		defaultWidth: 800,
		defaultHeight: 600,
		minWidth: 455,
		minHeight: 470,
	},
	"PongLeave.exe": {
		icon: PongIcon,
		iconShow: false,
		WindowContent: PongLeave,
		defaultWidth: 400,
		defaultHeight: 150,
		minWidth: 400,
		minHeight: 150,
		maxWidth: 400,
		maxHeight: 150,
	},
	"BLN.exe": {
		icon: BlnIcon,
		iconShow: true,
		WindowContent: BLN,
		defaultWidth: 500,
		defaultHeight: 600,
		minWidth: 455,
		minHeight: 460,
	},
	"MPlayer.exe": {
		icon: MusicIcon,
		iconShow: true,
		WindowContent: MusicPlayer,
		defaultWidth: 600,
		defaultHeight: 265,
		minWidth: 580,
		minHeight: 245,
		maxWidth: 740,
		maxHeight: 325,
	},
};

const Taskbar = ({
	setShowRegisterModal,
	showRegisterModal,
	onResetAllWindows,
}: {
	setShowRegisterModal: (show: boolean) => void;
	showRegisterModal: boolean;
	onResetAllWindows: () => void;
}) => {
	const [currentDateTime, setCurrentDateTime] = useState(new Date());
	const imgKey = showRegisterModal ? "house-icon" : "avatar-icon";

	useEffect(() => {
		const timerID = setInterval(() => {
			setCurrentDateTime(new Date());
		}, 1000);
		return () => {
			clearInterval(timerID);
		};
	}, []);

	const handleModal = () => {
		if (showRegisterModal) {
			setShowRegisterModal(false);
		} else {
			setShowRegisterModal(true);
		}
	};
	const formattedTime = currentDateTime.toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});

	const handleFullscreen = () => {
		//if already full screen; exit and if not already full screen; go full screen
		if (!document.fullscreenElement) {
			if (document.documentElement.requestFullscreen) {
				document.documentElement.requestFullscreen();
			}
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			}
		}
	};
	return (
		<div className={styles.taskbar}>
			<button
				title="Reset Screen"
				className={styles.avatarButton}
				onClick={onResetAllWindows}
			>
				<img
					key={imgKey}
					className={styles.avatarIcon}
					src={Refresh}
					alt="reset Icon"
				/>
			</button>
			<button
				title="Fullscreen"
				className={styles.avatarButton}
				onClick={handleFullscreen}
			>
				<img
					key={imgKey}
					className={styles.avatarIcon}
					src={FullScreenIcon}
					alt="fullscreen Icon"
				/>
			</button>
			<button className={styles.avatarButton} onClick={handleModal}>
				{showRegisterModal ? (
					<img
						title="Home"
						key={imgKey}
						className={styles.avatarIcon}
						src={HouseIcon}
						alt="House Icon"
					/>
				) : (
					<img
						title="Change Avatar"
						key={imgKey}
						className={styles.avatarIcon}
						src={AvatarIcon}
						alt="Avatar Icon"
					/>
				)}{" "}
			</button>
			<div className={styles.time}>{formattedTime}</div>
		</div>
	);
};

const Window: React.FC<{
	window: Window;
	resetSize: boolean;
	children: React.ReactNode;
	className?: string;
	onClose: () => void;
	onClick: (id: number) => void;
	openNewWindow: (
		content: string,
		targetElement: HTMLElement | null,
		argument?: any
	) => void;
	style?: React.CSSProperties;
}> = ({
	window,
	resetSize,
	onClose,
	onClick,
	children,
	className,
	openNewWindow,
	style,
}) => {
	const {
		defaultWidth,
		defaultHeight,
		minWidth,
		minHeight,
		maxWidth,
		maxHeight,
		icon,
	} = applications[window.content];
	const [isFadingIn, setIsFadingIn] = useState(true);
	const [scale, setScale] = useState(0);
	const [opacity, setOpacity] = useState(0);
	const animationRef = useRef<HTMLDivElement>(null);
	const timeoutId = setTimeout(() => setIsFadingIn(false), 10);
	const { isInGame } = useContext(GameContext);
	const elementRef = useRef<HTMLDivElement>(null);
	const { incrementResetWindowsNumber } = useContext(GameContext);
	const [defaultSize] = useState({
		width: defaultWidth,
		height: defaultHeight,
	});
	const closeBtnRef = useRef<HTMLButtonElement>(null);
	const defaultX = window.position.x - defaultWidth / 2;
	const defaultY = window.position.y - defaultHeight / 2;
	const [position, setPosition] = useState({ x: defaultX, y: defaultY });
	const [currentSize, setCurrentSize] = useState({
		width: defaultWidth,
		height: defaultHeight,
	});
	const resizableRef = useRef(null);
	const handleResize = (
		event: any,
		data: { node: HTMLElement; size: { width: number; height: number } }
	) => {
		setCurrentSize(data.size);
	};

	useEffect(() => {
		return () => clearTimeout(timeoutId);
	}, []);

	const handleClose = (event: React.MouseEvent) => {
		event.stopPropagation();
		if (window.content === "Pong.exe") {
			if (isInGame) {
				openNewWindow("PongLeave.exe", closeBtnRef.current);
			} else {
				onClose();
			}
		} else {
			onClose();
		}
		createPongSocket();
	};

	// useEffect(() => {
	// 	if (window.content === "PongLeave.exe" && !isInGame) {
	// 		onClose();
	// 	}
	// }, [isInGame]);

	//move window to center with scale and opacity animation
	const moveWindowToCenter = () => {
		const targetX = Math.round(
			(global.window.innerWidth - defaultWidth) / 2
		);
		const targetY = Math.round(
			(global.window.innerHeight - defaultHeight) / 2
		);
		const resizableHandle = document.querySelector(
			`#window-${window.id} .react-resizable-handle`
		) as HTMLElement;

		if (resizableHandle) {
			resizableHandle.style.display = "none";
		}
		setPosition({ x: targetX, y: targetY });
		setScale(1);
		setOpacity(1);
		//wait for animation to finish before showing resizable handle
		setTimeout(() => {
			if (resizableHandle) {
				resizableHandle.style.display = "block";
			}
		}, 500);
	};
	const moveWindowToCenterNoAnimationAndresetSize = () => {
		if (resizableRef.current) {
			setCurrentSize({ ...defaultSize });
		}
		setTimeout(() => {
			moveWindowToCenterNoAnimation();
		}, 10);
	};
	const moveWindowToCenterNoAnimation = () => {
		if (elementRef.current) {
			const actualWidth = elementRef.current.clientWidth;
			const actualHeight = elementRef.current.clientHeight;
			console.log(actualWidth, actualHeight);
			const targetX = Math.round(
				(global.window.innerWidth - actualWidth) / 2
			);
			const targetY = Math.round(
				(global.window.innerHeight - actualHeight) / 2
			);

			setPosition({ x: targetX, y: targetY });
			setScale(1);
		}
	};
	useEffect(() => {
		if (resetSize) {
			moveWindowToCenterNoAnimationAndresetSize();
		}
		incrementResetWindowsNumber();
	}, [resetSize]);

	//recenter window if window size is changed
	useEffect(() => {
		const handleResize = () => {
			moveWindowToCenterNoAnimationAndresetSize();
		};
		global.window.addEventListener("resize", handleResize);
		return () => {
			global.window.removeEventListener("resize", handleResize);
		};
	}, [moveWindowToCenter]);

	useEffect(() => {
		const timer = setTimeout(() => {
			moveWindowToCenter();
		}, 10);
		return () => clearTimeout(timer);
	}, []);

	const onDragStart = () => {
		onClick(window.id);
		if (animationRef.current) {
			animationRef.current.classList.add(styles.noTransition);
		}
	};

	const onDragStop = (e: any, data: any) => {
		if (animationRef.current) {
			animationRef.current.classList.remove(styles.noTransition);
		}
		setPosition({ x: data.x, y: data.y });
	};

	return (
		<div
			className={styles.draggableWindows}
			id={`window-${window.id}`}
			style={style}
		>
			<Draggable
				cancel=".close"
				handle={`.${styles.titleBar}`}
				position={position}
				onDrag={onDragStart}
				onStop={onDragStop}
				bounds={{
					top: 0,
					left: 0,
					right: global.window.innerWidth - currentSize.width,
					bottom: global.window.innerHeight - currentSize.height - 40,
				}}
			>
				<div
					style={{
						opacity: opacity,
						width: "100%",
						height: "100%",
					}}
					className={styles.animate}
					ref={animationRef}
				>
					<ResizableBox
						ref={resizableRef}
						width={currentSize.width}
						height={currentSize.height}
						onResize={handleResize}
						minConstraints={[minWidth, minHeight]}
						maxConstraints={[
							maxWidth ?? global.window.innerWidth - position.x,
							maxHeight ??
								global.window.innerHeight - position.y - 40,
						]}
						className={`${isFadingIn ? `${styles.fadeIn}` : ""} ${
							styles.resizableWindow
						}`}
					>
						<div
							style={{
								transform: `scale(${scale})`,
							}}
							ref={elementRef}
							className={`${styles.window} ${className}`}
							onClick={() => onClick(window.id)}
						>
							<div className={styles.titleBar}>
								<div
									className={
										styles.titleBarTextAndIconContainer
									}
								>
									<img
										src={icon}
										alt="Icon"
										className={styles.icontitleBar}
									/>
									<span>{window.content}</span>
								</div>
								<button
									onClick={handleClose}
									className={`close ${styles.closeButton}`}
									ref={closeBtnRef}
								>
									✖
								</button>
							</div>
							<div
								className={styles.windowContent}
								id="windowContent"
							>
								{
									React.Children.map(children, (child) =>
										React.isValidElement(child)
											? React.cloneElement(
													child as React.ReactElement<any>,
													{
														argument:
															window.argument,
													}
											  )
											: child
									) as React.ReactElement[]
								}
							</div>
						</div>
					</ResizableBox>
				</div>
			</Draggable>
		</div>
	);
};

const Icon: React.FC<{
	appName: string;
	icon: string;
	onDoubleClick: (event: React.MouseEvent) => void;
	onDoubleTap: (event: React.TouchEvent) => void;
	// onDoubleTap: (position: {
	// 	x: number;
	// 	y: number;
	// 	isTouch?: boolean;
	// }) => void;
	index: number;
}> = ({ appName, icon, onDoubleClick, onDoubleTap, index }) => {
	const [lastTouchEnd, setLastTouchEnd] = useState(0);
	const [position, setPosition] = useState({ x: 0, y: 0 }); // Nouvel état pour gérer la position
	const [activeIcon, setActiveIcon] = useState<string | null>(null);

	const handleClick = () => {
		setActiveIcon(appName);
	};

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const iconContainer = document.querySelector(
				`.${styles.iconContainer}-${index}`
			);
			if (
				iconContainer &&
				!iconContainer.contains(event.target as Node)
			) {
				setActiveIcon(null);
			}
		};

		document.addEventListener("click", handleClickOutside);

		return () => {
			document.removeEventListener("click", handleClickOutside);
		};
	}, []);

	const handleTouchEnd = (event: React.TouchEvent) => {
		const now = new Date().getTime();
		if (now - lastTouchEnd <= 300) {
			onDoubleTap(event);
			event.preventDefault();
		}
		setLastTouchEnd(now);
	};

	useEffect(() => {
		const handleResize = () => {
			setPosition({ x: 0, y: 0 }); // Réinitialise la position lors du redimensionnement de la fenêtre
		};

		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
		};
	}, []);

	useEffect(() => {
		if (activeIcon !== appName) {
			setActiveIcon(null);
		}
	}, [activeIcon, appName]);

	return (
		<Draggable
			position={position}
			onStart={(e) => e.stopPropagation()}
			bounds="parent"
			onDrag={(e, data) => setPosition({ x: data.x, y: data.y })}
		>
			<div
				className={`${styles.iconContainer} ${styles.iconContainer}-${index} `}
				onClick={handleClick}
			>
				{/* <div
					className={`${styles.iconHighlight} ${
						activeIcon === appName ? styles.highlight : ""
					}`}
				> */}
				<div
					style={{ backgroundImage: `url(${icon})` }}
					onDoubleClick={onDoubleClick}
					onTouchEnd={handleTouchEnd}
					className={`${styles.icon} ${
						activeIcon === appName ? styles.highlight : ""
					}`}
				></div>
				{/* </div> */}
				<span
					className={`${styles.iconName} ${
						activeIcon === appName ? styles.highlight : ""
					}`}
				>
					{appName}
				</span>
			</div>
		</Draggable>
	);
};
// define app with a conditionnal showAnimation variable
const App: React.FC = () => {
	const [closePong, setClosePong] = useState<number>(-1);
	const [windows, setWindows] = useState<Window[]>([]);
	const windowsRef = useRef<Window[]>([]);
	const [showRegisterModal, setShowRegisterModal] = useState(false); // add this
	const [username, setUsername] = useState("");
	const [avatar, setAvatar] = useState("");
	const [isInGame, setIsInGame] = useState(false);
	const [resetWindows, setResetWindows] = useState(false);
	const [resetWindowsNumber, setResetWindowsNumber] = useState(0);
	const [blnClosed, setBlnClosed] = useState(true);
	const notifContainerRef = useRef(null);
	const [zIndices, setZIndices] = useState<number[]>([]);
	const [wantedUsername, setWantedUsername] = useState("");
	const navigate = useNavigate();
	const [notification, setNotification] = useState<ChatNotificationsProps>({
		username: "",
		message: "",
		channelName: "",
	});
	const [gameInvitationSent, setGameInvitationSent] = useState<string>("");
	const location = useLocation();
	const container = useRef<HTMLDivElement>(null);
	const crtMaskUp = useRef<HTMLDivElement>(null);
	const crtMaskDown = useRef<HTMLDivElement>(null);
	const showAnimation: boolean =
		(location.state as any)?.showAnimation ?? false;
	const [popupData, setPopupData] = useState<PopupData | null>(null);
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
	const mousePositionRef = useRef({ x: 0, y: 0 });

	const updateMousePositionCapturePhase = (e: MouseEvent) => {
		mousePositionRef.current = { x: e.clientX, y: e.clientY };
	};

	const showPopup = (message: string) => {
		const x = mousePositionRef.current.x;
		const y = mousePositionRef.current.y;

		setPopupData(null);

		setTimeout(() => {
			setPopupData({ message, x, y });
		}, 0);

		setTimeout(() => {
			setPopupData(null);
		}, 5000);
	};

	useEffect(() => {
		windowsRef.current = windows;
	}, [windows]);

	// useEffect(() => {
	// 	window.addEventListener(
	// 		"mousemove",
	// 		updateMousePositionCapturePhase,
	// 		true
	// 	);

	// 	return () => {
	// 		window.removeEventListener(
	// 			"mousemove",
	// 			updateMousePositionCapturePhase,
	// 			true
	// 		);
	// 	};
	// }, []);
	useEffect(() => {
		window.addEventListener("mousemove", updateMousePositionCapturePhase);

		return () => {
			window.removeEventListener(
				"mousemove",
				updateMousePositionCapturePhase
			);
		};
	}, []);

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
	const [startPos, setStartPos] = useState<{ x: number; y: number }>({
		x: 0,
		y: 0,
	});
	const [endPos, setEndPos] = useState<{ x: number; y: number }>({
		x: 0,
		y: 0,
	});
	const [hasDragged, setHasDragged] = useState(false);
	const [isSelecting, setIsSelecting] = useState(false);
	const selectionRef = useRef<HTMLDivElement | null>(null);
	const DRAG_MAX = 5;
	let timeoutId: number | null = null;
	const [friends, setFriends] = useState<
		Array<{ username: string; status: string }>
	>([]);
	const [blockList, setBlockList] = useState<Array<{ username: string }>>([]);
	const [friendRequestsSent, setFriendRequestsSent] = useState<
		{
			username: string;
		}[]
	>([]);
	const transitions = useTransition(showRegisterModal, {
		from: { scale: 0 },
		enter: { scale: 1 },
		leave: { scale: 0 },
		config: { duration: 100 },
	});
	const socketService = SocketService.getInstance();

	const handleNotification = (notification: ChatNotificationsProps) => {
		setNotification(notification);
	};
	useEffect(() => {
		socketService.setNotificationCallback(handleNotification);
	}, [setNotification]);

	const openNewWindow = (
		content: string,
		targetElement: HTMLElement | null,
		argument?: any
	) => {
		const existingWindow = windowsRef.current.find(
			(window) => window.content === content
		);
		if (existingWindow) {
			setTimeout(() => {
				handleWindowClick(
					windows.findIndex(
						(window) => window.id === existingWindow.id
					)
				);
			}, 100);
			return;
		}
		let position = { x: 0, y: 0 };
		if (targetElement) {
			const rect = targetElement.getBoundingClientRect();
			position = {
				x: rect.left,
				y: rect.top,
			};
		}
		const newZIndex = zIndices.length > 0 ? Math.max(...zIndices) + 1 : 0;
		setZIndices([...zIndices, newZIndex]);
		if (!existingWindow) {
			const newId = Date.now();
			setWindows((prev) => [
				...prev,
				{
					id: newId,
					content: content,
					position: { x: position.x, y: position.y },
					defaultWidth: applications[content].defaultWidth,
					defaultHeight: applications[content].defaultHeight,
					argument: argument,
					zIndex: newZIndex,
				},
			]);

			if (content === "BLN.exe") {
				setNotification({ username: "", message: "", channelName: "" });
			}
			setTimeout(() => {
				handleWindowClick(windows.length);
			}, 100);
		}
	};

	const closeWindow = (windowId: number) => {
		const indexToRemove = windows.findIndex(
			(window) => window.id === windowId
		);
		if (indexToRemove === -1) return; // Si la fenêtre n'est pas trouvée, rien à faire.

		const zIndexToRemove = zIndices[indexToRemove];
		const newZIndices = zIndices
			.filter((_, index) => index !== indexToRemove)
			.map((zIndex) => (zIndex > zIndexToRemove ? zIndex - 1 : zIndex));

		setWindows(windows.filter((window) => window.id !== windowId));
		setZIndices(newZIndices);
	};

	const handleResetAllWindows = () => {
		setResetWindows(true);
	};

	const incrementResetWindowsNumber = () => {
		setResetWindowsNumber((prev) => prev + 1);
	};
	useEffect(() => {
		//get number of open windows
		const numWindows = windows.length;
		if (resetWindowsNumber >= numWindows) {
			setResetWindows(false);
			setResetWindowsNumber(0);
		}
	}, [resetWindowsNumber]);

	const handlePongLeaveClose = (id: number, value: number) => {
		if (value === 0) {
			// setWindows((prev) => prev.filter((window) => window.id !== id));
			closeWindow(id);
			setClosePong(0);
		} else if (value === 1) {
			setWindows((prev) =>
				prev.filter(
					(window) =>
						window.id !== id && window.content !== "Pong.exe"
				)
			);
			setClosePong(1);
		}
	};
	const handleWindowClick = (index: number) => {
		setZIndices((prev) => {
			const newZIndices = [...prev];
			const maxZIndex = newZIndices.length - 1;

			if (
				index >= 0 &&
				index < windows.length &&
				windows[index]?.content === "PongLeave.exe"
			) {
				// Si la fenêtre cliquée est "PongLeave.exe", on la laisse à l'index le plus élevé
				return newZIndices;
			}

			const clickedZIndex = newZIndices[index];

			for (let i = 0; i < newZIndices.length; i++) {
				if (newZIndices[i] > clickedZIndex) {
					newZIndices[i] -= 1;
				}
			}

			newZIndices[index] = maxZIndex;

			// Vérifier si l'index de "PongLeave.exe" a été déplacé et le remettre en haut si nécessaire
			const pongLeaveIndex = windows.findIndex(
				(window) => window.content === "PongLeave.exe"
			);
			if (pongLeaveIndex >= 0) {
				newZIndices[pongLeaveIndex] = maxZIndex;
				newZIndices[index] = maxZIndex - 1;
			}

			return newZIndices;
		});
	};

	useEffect(() => {
		const requestOptions: RequestInit = {
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
			method: "GET",
		};
		fetchProtect(
			process.env.REACT_APP_NEST_URL + "/auth/myInfos",
			requestOptions,
			navigate
		).then((data) => {
			console.log(data);
			setUsername(data.username);
			setAvatar(data.avatar);
		});
	}, []);

	const handleMouseDown = (e: React.MouseEvent) => {
		if (!(e.target as HTMLElement).classList.contains("iconGrid")) return;

		setIsSelecting(true);
		setStartPos({ x: e.clientX, y: e.clientY });
		setEndPos({ x: e.clientX, y: e.clientY });
	};

	const handleMouseUp = (e: React.MouseEvent) => {
		if (!(e.target as HTMLElement).classList.contains("iconGrid")) return;

		setIsSelecting(false);
		setHasDragged(false);
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!isSelecting) return;

		const width = Math.abs(startPos.x - e.clientX);
		const height = Math.abs(startPos.y - e.clientY);

		if (width > DRAG_MAX || height > DRAG_MAX) {
			setHasDragged(true);
			setEndPos({ x: e.clientX, y: e.clientY });
		}
	};
	const notifClick = () => {
		//openNewWindow BLN window with string to channel of the notification (only if bln not already open)
		if (blnClosed) {
			setBlnClosed(false);
			const channelName = notification.channelName;
			openNewWindow("BLN.exe", notifContainerRef.current, channelName);
			setNotification({ username: "", message: "", channelName: "" });
		}
	};
	useEffect(() => {
		if (selectionRef.current && isSelecting && hasDragged) {
			const width = Math.abs(endPos.x - startPos.x);
			const height = Math.abs(endPos.y - startPos.y);

			selectionRef.current.style.width = `${width}px`;
			selectionRef.current.style.height = `${height}px`;
			selectionRef.current.style.left = `${
				startPos.x < endPos.x ? startPos.x : endPos.x
			}px`;
			selectionRef.current.style.top = `${
				startPos.y < endPos.y ? startPos.y : endPos.y
			}px`;
		} else if (selectionRef.current) {
			selectionRef.current.style.width = "0px";
			selectionRef.current.style.height = "0px";
		}
	}, [startPos, endPos, isSelecting, hasDragged]);

	useEffect(() => {
		const requestOptions: RequestInit = {
			credentials: "include",
			method: "GET",
			headers: { "Content-Type": "application/json" },
		};
		setInterval(() => {
			fetchProtect(
				process.env.REACT_APP_NEST_URL + "/keep-alive-endpoint",
				requestOptions,
				navigate
			)
				.then((data) => {
					console.log("Session maintenue active:", data);
				})
				.catch((error) => {
					console.error(
						"Erreur lors du maintien de la session:",
						error
					);
				});
		}, 45 * 60 * 1000); //45min
	}, []);

	//end of handle selection cursor //
	return (
		<div className={styles.app} id="app" ref={container}>
			<div className="crtMaskUp" ref={crtMaskUp} />
			<div className="crtMaskDown" ref={crtMaskDown} />
			{popupData && (
				<Popup
					message={popupData.message}
					x={popupData.x}
					y={popupData.y}
				/>
			)}

			<GameContext.Provider
				value={{
					isInGame,
					setIsInGame,
					username,
					avatar,
					setAvatar,
					incrementResetWindowsNumber,
					setBlnClosed,
					blnClosed,
					notification,
					setNotification,
					friends,
					setFriends,
					openNewWindow,
					wantedUsername,
					setWantedUsername,
					setShowRegisterModal,
					friendRequestsSent,
					setFriendRequestsSent,
					blockList,
					setBlockList,
					gameInvitationSent,
					setGameInvitationSent,
					showPopup,
				}}
			>
				<BLNInit />
				<Taskbar
					setShowRegisterModal={setShowRegisterModal}
					showRegisterModal={showRegisterModal}
					onResetAllWindows={handleResetAllWindows}
				/>

				<ChatNotifications
					channelName={notification.channelName}
					username={notification.username}
					message={notification.message}
					onClick={notifClick}
					ref={notifContainerRef}
				/>
				<div className={styles.background}>
					<div className={styles.backgroundTop}>
						<div className={styles.backgroundLeft}></div>
						<div className={styles.backgroundCenter}></div>
						<div className={styles.backgroundRight}></div>
					</div>
					<div className={styles.backgroundBottom}></div>
				</div>

				{transitions((style, item) =>
					item ? (
						<div className={styles.registerWindow}>
							{" "}
							<animated.div style={style}>
								<Register
									storedUsername={username || "ERROR"}
									avatarUpdate={true}
								/>
							</animated.div>
						</div>
					) : null
				)}
				{/* {showRegisterModal ? null : ( */}
				<div
					className={styles.desktop}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
				>
					<div ref={selectionRef} className={styles.selection} />
					<div className={`${styles.iconGrid} iconGrid`}>
						{Object.keys(applications).map((appKey, index) => {
							if (!applications[appKey].iconShow) {
								return null;
							}
							return (
								<Icon
									key={appKey}
									appName={appKey}
									icon={applications[appKey].icon}
									onDoubleClick={(e) =>
										openNewWindow(
											appKey,
											e.target as HTMLElement
										)
									}
									onDoubleTap={(e) =>
										openNewWindow(
											appKey,
											e.target as HTMLElement
										)
									}
									index={index}
								/>
							);
						})}
					</div>

					<div className={styles.windowsContainer}>
						{windows.map((window, index) => {
							if (window) {
								const zIndex = zIndices[index];
								const WindowContent =
									applications[window.content].WindowContent;
								const highestZIndex = Math.max(...zIndices);
								const isTopWindow = zIndex === highestZIndex;
								return (
									<Window
										key={window.id}
										window={window}
										resetSize={resetWindows}
										onClose={() => closeWindow(window.id)}
										openNewWindow={openNewWindow}
										onClick={() => handleWindowClick(index)}
										style={{ zIndex: zIndex }}
										className={
											isTopWindow
												? `${styles.topWindow}`
												: ""
										}
									>
										{window.content === "PongLeave.exe" ? (
											<PongLeave
												closePong={closePong}
												onClose={(value) =>
													handlePongLeaveClose(
														window.id,
														value
													)
												}
											/>
										) : (
											<WindowContent />
										)}
									</Window>
								);
							}
						})}
					</div>
				</div>
				{/* )} */}
			</GameContext.Provider>
		</div>
	);
};

export default App;
