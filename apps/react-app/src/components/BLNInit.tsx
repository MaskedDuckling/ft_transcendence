import { useEffect, useContext } from "react";
import { GameContext } from "../pages/App";
import SocketService from "../services/BLNSocketService";
import { useNavigate, useLocation } from "react-router-dom";

const BLNInit = () => {
	const navigate = useNavigate();
	const socketService = SocketService.getInstance();
	const [friends, setFriends] = [
		useContext(GameContext).friends,
		useContext(GameContext).setFriends,
	];

	const [friendRequestsSent, setFriendRequestsSent] = [
		useContext(GameContext).friendRequestsSent,
		useContext(GameContext).setFriendRequestsSent,
	];
	useEffect(() => {
		socketService.listenToChannelsRetrieved((channels) => {
			channels.forEach((channel) => {
				socketService.listenToMessages(
					channel.id,
					channel.name,
					(messages) => {
						// console.log("messages", messages);
					}
				);
			});
		});
		socketService.listenToFriendshipsRetrieved(
			(retrievedFriends: { username: string; status: string }[]) => {
				setFriends(retrievedFriends);
			}
		);
		socketService.listenToFriendDeleted((friend) => {
			setFriends((prevFriends) =>
				prevFriends.filter(
					(friend) => friend.username !== friend.username
				)
			);
		});
		socketService.getPendingFriendRequests();
		const handlePendingFriendRequests = ({ from, sent }: any) => {
			const formattedRequestsSent = sent.map((req: any) => {
				return {
					username: req.username,
				};
			});
			setFriendRequestsSent(formattedRequestsSent);
		};
		const handleFriendRequestSent = (username: string) => {
			setFriendRequestsSent((prev) => [...prev, { username }]);
		};
		const handleFriendAccepted = (username: string, status: string) => {
			setFriends((prevFriends) => [...prevFriends, { username, status }]);
			setFriendRequestsSent((prev) =>
				prev.filter((req) => req.username !== username)
			);
		};
		const handleFriendRejected = (username: string) => {
			setFriendRequestsSent((prev) =>
				prev.filter((req) => req.username !== username)
			);
		};
		socketService.listenToPendingFriendRequests(
			handlePendingFriendRequests
		);
		socketService.listenToFriendRequestSent(handleFriendRequestSent);
		socketService.listenToFriendRequestAcceptedNotification(
			handleFriendAccepted
		);
		socketService.listenToFriendRequestRejectedNotification(
			handleFriendRejected
		);
		socketService.listenToFriendAccepted(handleFriendAccepted);
		socketService.listenToPM((messages) => {});
		socketService.emit("InitApp", {});
		socketService.setBlnClosed(true);
		socketService.listenToPing(() => {
			socketService.emitNoData("Pong");
		});

		// listen to sessionExpired and if true, redirect to login
		socketService.listenToSessionExpired(() => {
			navigate("/?error=403");
		});
	}, []);

	return null;
};

export default BLNInit;
