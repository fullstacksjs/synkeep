const { httpServer } = require('./app');
const io = require('./io');

httpServer.listen(process.env.PORT || 3000, () => {
  console.log('Server Listening...');
});
