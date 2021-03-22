const { createHmac } = require('crypto');
const express = require('express');
const nanoid = require('nanoid');
const requestIp = require('request-ip');
const rooms = require('./rooms');

const app = express();
const httpServer = require('http').createServer(app);

app.use(express.static('public'));
app.use(express.json({ limit: '1kb' }));
app.use(requestIp.mw());

app.all('/token', (req, res) => {
  const key = req.body.password || req.clientIp;

  const alphabet = 'abcdefghijklmnopqrstuvwxyz123456780';
  const token = nanoid.customAlphabet(alphabet, 6)();

  const hashedToken = createHmac('sha512', key).update(token).digest('hex');

  rooms.push(hashedToken);

  res.json({ token });
});

module.exports = { app, httpServer };
