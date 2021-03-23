const { createHmac } = require('crypto');
const nanoid = require('nanoid');

const rooms = require('../rooms');

exports.getToken = (req, res) => {
  const key = req.body.password || req.clientIp;

  const hashKey = req.body.password ? 'password' : 'ip';

  let tokenExists = true;

  const alphabet = 'abcdefghijklmnopqrstuvwxyz123456780';
  let token, hashedToken;

  while (tokenExists) {
    token = nanoid.customAlphabet(alphabet, 4)();
    hashedToken = createHmac('sha512', key).update(token).digest('hex');

    tokenExists = rooms.findIndex((room) => room === hashedToken) >= 0;
  }

  rooms.push(hashedToken);

  res.json({ token, hashKey });
};
