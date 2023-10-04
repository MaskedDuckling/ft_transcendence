// import { io, Socket } from "socket.io-client";

// const ENDPOINT = "http://localhost:3001";
// export const pongSocket: Socket = io(ENDPOINT);

// export default pongSocket;

import { io, Socket } from "socket.io-client";

const ENDPOINT = process.env.REACT_APP_NEST_URL || "http://localhost:3001";
let pongSocket: Socket | null = null;

export const createPongSocket = (): Socket => {
	if (!pongSocket) {
		pongSocket = io(ENDPOINT, { withCredentials: true });
	}
	return pongSocket;
};

export default createPongSocket;
