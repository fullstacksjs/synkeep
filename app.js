const express = require('express');
const requestIp = require('request-ip');

const app = express();
const httpServer = require('http').createServer(app);

const controller = require('./controllers/web');

app.use(express.static('public'));
app.use(express.json({ limit: '1kb' }));
app.use(requestIp.mw());

app.all('/token', controller.getToken);

module.exports = { app, httpServer };
