import React, { useState, useEffect, useContext, useRef } from "react";
import styles from "../assets/styles/ChatNotification.module.css";
import BlnIcon from "../assets/images/blnIcon.svg";

type ChatNotificationsProps = {
	channelName: string;
	message: string;
	username: string;
	onClick: () => void;
};

const useDebounce = (callback: () => void, delay: number) => {
	const timeoutRef = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (timeoutRef.current !== null) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	const debouncedCallback = () => {
		if (timeoutRef.current !== null) {
			clearTimeout(timeoutRef.current);
		}

		timeoutRef.current = window.setTimeout(() => {
			callback();
		}, delay) as unknown as number;
	};

	return debouncedCallback;
};

const ChatNotifications = React.forwardRef<
	HTMLDivElement,
	ChatNotificationsProps
>(({ channelName, username, message, onClick }, ref) => {
	const notifTextRef = useRef<HTMLParagraphElement | null>(null);
	const [truncatedMessage, setTruncatedMessage] = useState(message);
	const [isFadingOut, setIsFadingOut] = useState(false);
	const [opacity, setOpacity] = useState(0);
	const fadeOutTimerRef = useRef<number | null>(null);
	const notifContainerRef = ref as React.MutableRefObject<HTMLDivElement>;
	const [isPrivateChannel, setIsPrivateChannel] = useState(false);

	const adjustText = () => {
		const element = notifTextRef.current;

		if (element) {
			let tmpMessage = message;

			let isTruncated = false;

			element.textContent = tmpMessage;

			while (
				element.scrollHeight > element.clientHeight &&
				tmpMessage.length > 0
			) {
				if (tmpMessage.includes(" ")) {
					tmpMessage = tmpMessage.substring(
						0,
						tmpMessage.lastIndexOf(" ")
					);
				} else {
					tmpMessage = tmpMessage.substring(0, tmpMessage.length - 1);
				}
				element.textContent = tmpMessage + "...";
				isTruncated = true;
			}
			setTruncatedMessage(tmpMessage + (isTruncated ? "..." : ""));
		}
	};
	const debouncedAdjustText = useDebounce(adjustText, 150);

	const handleMouseEnter = () => {
		if (fadeOutTimerRef.current !== null) {
			clearTimeout(fadeOutTimerRef.current);
		}
	};

	const handleMouseLeave = () => {
		startFadeOut();
	};

	const onClickFadeOut = () => {
		if (fadeOutTimerRef.current !== null) {
			clearTimeout(fadeOutTimerRef.current);
		}
		setIsFadingOut(true);
		setOpacity(0);
		setTimeout(() => {
			onClick();
		}, 400);
	};

	const startFadeOut = () => {
		if (fadeOutTimerRef.current !== null) {
			clearTimeout(fadeOutTimerRef.current);
		}

		fadeOutTimerRef.current = window.setTimeout(() => {
			setIsFadingOut(true);
			setOpacity(0);
		}, 5000) as unknown as number;
	};

	useEffect(() => {
		const resizeObserver = new ResizeObserver(() => {
			requestAnimationFrame(() => {
				debouncedAdjustText();
			});
		});

		if (notifContainerRef.current) {
			resizeObserver.observe(notifContainerRef.current);
		}

		return () => {
			if (notifContainerRef.current) {
				resizeObserver.unobserve(notifContainerRef.current);
			}
		};
	}, [message]);
	useEffect(() => {
		if (message !== "") {
			setIsPrivateChannel(channelName[0] === "@");
			setOpacity(1);
			setIsFadingOut(false);
			startFadeOut();
		}
	}, [message]);

	if (message === "") {
		return null;
	}
	return (
		<div
			onClick={onClickFadeOut}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			style={{ opacity: opacity }}
			className={`${styles.notifContainer} ${
				isFadingOut ? styles.fadeOut : ""
			}`}
			ref={notifContainerRef}
		>
			{isPrivateChannel ? (
				<img
					src={
						process.env.REACT_APP_NEST_URL +
						"/uploads/" +
						username +
						".jpg"
					}
					alt="Avatar Icon"
					className={styles.notifIcon}
				/>
			) : (
				<img
					src={BlnIcon}
					alt="Avatar Icon"
					className={styles.notifIcon}
				/>
			)}
			<div className={styles.notifTextContainer}>
				<div className={styles.titleAndChannelContainer}>
					<h1 className={styles.notifTitle}>{username}</h1>
					{!isPrivateChannel && (
						<p className={styles.notifChannel}>({channelName})</p>
					)}
				</div>
				<p className={styles.notifText} ref={notifTextRef}>
					{truncatedMessage}
				</p>
			</div>
		</div>
	);
});

export default ChatNotifications;
