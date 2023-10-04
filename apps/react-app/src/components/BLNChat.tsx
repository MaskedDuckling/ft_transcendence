import React, { useContext, useState, useEffect } from "react";
import { GameContext } from "../pages/App";
import SocketService from "../services/BLNSocketService";

const BLNChat = ({ channelName }: { channelName: string }) => {
	const socketService = SocketService.getInstance();
	const [message, setMessage] = useState<string>("");
	const [chats, setChats] = useState<
		Array<{ user: string; message: string }>
	>([]);

	const sendMessage = (e: React.FormEvent) => {
		e.preventDefault();
		socketService.sendMessage(message);
		setMessage("");
	};

	return (
		<div>
			<h2>{channelName}</h2>
			{chats.map((chat, index) => (
				<div key={index}>
					<strong>{chat.user}</strong>: {chat.message}
				</div>
			))}
			<form onSubmit={sendMessage}>
				<input
					type="text"
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					placeholder="Type a message"
				/>
				<button type="submit">Send</button>
			</form>
		</div>
	);
};

export default BLNChat;
