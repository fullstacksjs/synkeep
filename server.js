const { httpServer } = require('./app');
const io = require('./io');

httpServer.listen(3000, () => {
  console.log('Server Listening...');
});
