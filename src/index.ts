import * as socket from 'ws';

const PORT = 3000;
const wss = new socket.Server({ port: PORT });

wss.on('connection', (ws: any) => {
  ws.on('message', (message: string) => {
    console.log(`Server received message: ${message}`);
  });

  ws.send('connected');
});


console.log('Watching on port 3000');
