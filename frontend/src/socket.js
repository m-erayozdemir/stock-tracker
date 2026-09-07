import { io } from "socket.io-client";

const socket = io(`http://${window.location.hostname}:5001`, {
  withCredentials: true,
  transports: ["websocket"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

export default socket;
