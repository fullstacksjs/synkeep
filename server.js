const { httpServer } = require('./app');
const io = require('./io');

httpServer.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log('Server Listening...');
});
