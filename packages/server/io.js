const { httpServer } = require('./app');
const controller = require('./controllers/socket');

const io = require('socket.io')(httpServer);

io.use(controller.authMiddleware);

io.use(controller.addAgent);

io.on('connection', (socket) => {
  socket.join(socket.room);

  let time = new Date(socket.handshake.issued);
  socket.joinTime = `${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`;

  const room = io.sockets.adapter.rooms.get(socket.room);
  if (room.size === 1) {
    socket.ownedRoom = socket.room;
  }

  socket.on('clipboard', controller.onClipboard(socket));
  socket.on('clearClipboard', controller.onClearClipboard(io, socket));
  socket.on('logout', controller.logout(io, socket));
  socket.on('getSessions', controller.getSessions(io, socket));
  socket.on('terminate', controller.terminate(io, socket));
});

io.of('/').adapter.on('delete-room', controller.onDeleteRoom);

module.exports = io;
