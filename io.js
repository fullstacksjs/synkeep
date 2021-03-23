const { httpServer } = require('./app');
const rooms = require('./rooms');

const io = require('socket.io')(httpServer);
const { createHmac } = require('crypto');
const useragent = require('useragent');

io.use((socket, next) => {
  if (!socket.handshake.auth || !socket.handshake.auth.token)
    return next(new Error('Auth Token Required.'));
  if (socket.handshake.auth.token.length !== 4)
    return next(new Error('Auth Token Length Must Be 4 Characters Long.'));

  const token = socket.handshake.auth.token;
  const key = socket.handshake.auth.password || socket.handshake.address;

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
});

io.use((socket, next) => {
  socket.agent = useragent.lookup(socket.handshake.headers['user-agent']);
  next();
});

io.on('connection', (socket) => {
  socket.join(socket.room);

  let time = new Date(socket.handshake.issued);
  socket.joinTime = `${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`;

  const room = io.sockets.adapter.rooms.get(socket.room);
  if (room.size === 1) {
    socket.ownedRoom = socket.room;
  }

  socket.on('clipboard', (data) => {
    socket.to(socket.room).emit('clipboard', data);
  });

  io.on('clearClipboard', () => {
    io.to(socket.root).emit('clearClipboard');
  });

  socket.on('logout', () => {
    if (socket.ownedRoom) {
      const clients = io.sockets.adapter.rooms.get(socket.ownedRoom);
      for (const clientId of clients) {
        const clientSocket = io.sockets.sockets.get(clientId);
        clientSocket.disconnect();
      }
    }

    socket.disconnect();
  });

  socket.on('getSessions', () => {
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
  });

  socket.on('terminate', (socketId) => {
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
  });
});

io.of('/').adapter.on('delete-room', (room) => {
  const roomIndex = rooms.findIndex((roomName) => roomName === room);
  if (roomIndex >= 0) {
    rooms.splice(roomIndex, 1);
  }
});

module.exports = io;
