const useragent = require('useragent');
const { createHmac } = require('crypto');

const rooms = require('../rooms');

exports.authMiddleware = (socket, next) => {
  if (!socket.handshake.auth || !socket.handshake.auth.token)
    return next(new Error('Auth Token Required.'));
  if (socket.handshake.auth.token.length !== 4)
    return next(new Error('Auth Token Length Must Be 4 Characters Long.'));

  console.log(socket.handshake.address);

  const token = socket.handshake.auth.token;
  const key = socket.handshake.auth.password || socket.handshake.address;

  console.log(key);

  const hashedToken = createHmac('sha512', key).update(token).digest('hex');

  const room = rooms.find((room) => room === hashedToken);

  if (!room)
    return next(
      new Error(
        'Your token is wrong or maybe your ip address has been changed or password is wrong.'
      )
    );

  socket.room = room;
  next();
};

exports.addAgent = (socket, next) => {
  socket.agent = useragent.lookup(socket.handshake.headers['user-agent']);
  next();
};

exports.onClipboard = (socket) => (data) => {
  socket.to(socket.room).emit('clipboard', data);
};
exports.onClearClipboard = (io, socket) => () => {
  io.to(socket.root).emit('clearClipboard');
};

exports.logout = (io, socket) => () => {
  if (socket.ownedRoom) {
    const clients = io.sockets.adapter.rooms.get(socket.ownedRoom);
    for (const clientId of clients) {
      const clientSocket = io.sockets.sockets.get(clientId);
      clientSocket.disconnect();
    }
  }

  socket.disconnect();
};

exports.getSessions = (io, socket) => () => {
  const sessions = [];

  const clients = io.sockets.adapter.rooms.get(socket.room);
  for (const clientId of clients) {
    const clientSocket = io.sockets.sockets.get(clientId);

    const agent = `${clientSocket.agent.toAgent()} on ${clientSocket.agent.os.toString()}`;

    sessions.push({
      [agent]: {
        id: clientSocket.id,
        ip: clientSocket.handshake.address,
        time: clientSocket.joinTime,
      },
    });
  }

  io.to(socket.id).emit('sessions', sessions);
};

exports.terminate = (io, socket) => (socketId) => {
  const clientSocket = io.sockets.sockets.get(socketId);

  if (!clientSocket) {
    return io
      .to(socket.id)
      .emit('terminationResult', `${socketId} does not exists.`);
  }

  if (clientSocket.handshake.issued <= socket.handshake.issued) {
    return io
      .to(socket.id)
      .emit(
        'terminationResult',
        `you can't terminate user which older than you in this room.`
      );
  }

  clientSocket.disconnect(true);
  io.to(socket.room).emit(
    'terminationResult',
    `${socket.id} terminated successfully.`
  );
};

exports.onDeleteRoom = (room) => {
  const roomIndex = rooms.findIndex((roomName) => roomName === room);
  if (roomIndex >= 0) {
    rooms.splice(roomIndex, 1);
  }
};
