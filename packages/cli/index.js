#! /usr/bin/env node

const { Command } = require('commander');
const ClipboardListener = require('clipboard-listener');
const clipboardy = require('clipboardy');
const inquirer = require('inquirer');
const readline = require('readline');
const io = require('socket.io-client');
const { default: fetch } = require('node-fetch');

const BASE_URL = 'synkeep.herokuapp.com';

const program = new Command();
program.version('1.0.0');

program
  .option('-p, --password <password>', 'password of token')
  .option('-t, --token <token>', 'token');

program.parse(process.argv);

const options = program.opts();

(async () => {
  if (options.token == null) {
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'hasPassword',
        message:
          'Do you want to set password for this token (if you are not in same network, this is necessary) ?',
        default: false,
      },
      {
        type: 'password',
        name: 'password',
        message: 'Enter your ideal password: ',
        when: (answers) => answers.hasPassword,
      },
    ]);
    if (answers.hasPassword) {
      options.password = answers.password;
      const res = await fetch(`https://${BASE_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: options.password }),
      });
      const jsonRes = await res.json();
      options.token = jsonRes.token;

      console.log(`Token: ${options.token}`);
    } else {
      const res = await fetch(`https://${BASE_URL}/token`);
      const jsonRes = await res.json();
      options.token = jsonRes.token;

      console.log(`Token: ${options.token}`);
    }
  }

  const socket = io(`ws://${BASE_URL}`, {
    autoConnect: false,
  });
  socket.auth = { token: options.token, password: options.password };

  const listener = new ClipboardListener({ immediate: false });

  socket.connect();

  const onKeyPress = async (str, key) => {
    if ((key.ctrl && key.name === 'c') || key.name === 'q') {
      socket.emit('logout');
      process.exit();
    } else if (str === 'g') {
      socket.emit('getSessions');
    } else if (str === 't') {
      process.stdin.removeAllListeners('keypress');
      const answers = await inquirer.prompt([
        {
          type: 'text',
          name: 'id',
          message: `Enter client id to terminate: `,
        },
      ]);
      socket.emit('terminate', answers.id);
      process.stdin.on('keypress', onKeyPress);
      process.stdin.setRawMode(true);
      process.stdin.resume();
    } else if (str === 'T') {
      console.log();
      console.log(`Current token: ${options.token}`);
      console.log();
    }
  };
  process.stdin.setRawMode(true);
  readline.emitKeypressEvents(process.stdin);
  process.stdin.on('keypress', onKeyPress);
  process.stdin.resume();

  socket.on('connect_error', (err) => {
    console.log(err.message);
    process.exit(-1);
  });

  socket.on('connect', () => {
    console.log('Connected to server.');
  });

  socket.on('sessions', (sessions) => {
    console.log();
    sessions.forEach((session) => {
      const values = Object.values(session)[0];
      const agent = Object.keys(session);
      console.log(
        `ID: ${values.id} -- IP: ${values.ip} -- Join Time: ${values.time} -- System Information: ${agent}`
      );
    });
    console.log();
  });

  socket.on('terminationResult', (message) => {
    console.log();
    console.log(`Termination result: ${message}`);
    console.log();
  });

  socket.on('getJoinPermission', async ({ id, agent }) => {
    process.stdin.removeAllListeners('keypress');
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'isApproved',
        message: `A new client wants to connect to this room, information: ${agent}, do you approve?`,
      },
    ]);
    if (answers.isApproved) {
      socket.emit('approve', id);
    }
    process.stdin.on('keypress', onKeyPress);
    process.stdin.setRawMode(true);
    process.stdin.resume();
  });

  const onClipboardChanged = (value) => {
    console.log();
    console.log('Your clipboard changed, sending to others...');
    console.log();
    socket.emit('clipboard', value);
  };

  listener.on('change', onClipboardChanged);

  socket.on('clipboard', (value) => {
    console.log();
    console.log('New clipboard received.');
    console.log();
    listener.stop();
    clipboardy.writeSync(value);
    listener.lastValue = value;
    listener.on('change', onClipboardChanged);
    listener.watch();
  });

  socket.on('disconnect', () => {
    console.log('Disconnected.');
    process.exit(-1);
  });
})();
