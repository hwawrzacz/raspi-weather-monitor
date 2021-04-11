import * as ws from 'ws';

const PORT = 3000;
const wss = new ws.Server({ port: PORT });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    console.log(`Server received message: ${message}`);
  });

  ws.send('connected');
});


console.log('Watching on port 3000');
