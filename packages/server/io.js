const { httpServer } = require('./app');
const controller = require('./controllers/socket');

const io = require('socket.io')(httpServer);

io.use(controller.authMiddleware);

io.use(controller.addAgent);

io.on('connection', (socket) => {
  const room = io.sockets.adapter.rooms.get(socket.room);
  if (!room) {
    socket.ownedRoom = socket.room;
    socket.join(socket.room);
    let time = new Date();
    socket.joinTime = `${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`;
  } else {
    const agent = `${socket.agent.toAgent()} on ${socket.agent.os.toString()}`;
    socket.to(socket.room).emit('getJoinPermission', { id: socket.id, agent });
  }

  socket.on('approve', controller.onApprove(io, socket));

  socket.on('clipboard', controller.onClipboard(socket));
  socket.on('clearClipboard', controller.onClearClipboard(io, socket));
  socket.on('logout', controller.logout(io, socket));
  socket.on('getSessions', controller.getSessions(io, socket));
  socket.on('terminate', controller.terminate(io, socket));
});

io.of('/').adapter.on('delete-room', controller.onDeleteRoom);

module.exports = io;
