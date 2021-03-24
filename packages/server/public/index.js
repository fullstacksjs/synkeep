// localStorage.debug = '*';

const socket = io('ws://localhost:3000', { autoConnect: false });

socket.on('connect_error', (err) => {
  console.log(err.message);
});
socket.on('connect', () => {
  console.log(socket.id);
});
socket.on('clipboard', (data) => {
  console.log({ data });
});
socket.on('sessions', (sessions) => {
  console.log({ sessions });
});
socket.on('terminationResult', (message) => {
  console.log({ message });
});
socket.on('clearClipboard', () => {
  console.log('history should be cleared.');
});
