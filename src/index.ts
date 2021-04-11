import * as socket from 'ws';
import * as shell from 'child_process';
import { interval } from 'rxjs';
import { tap } from 'rxjs/operators';

enum MessageType {
  CONNECTED = 'connected',
  TEMP_REQUEST = 'temp_request',
  TEMP_RESPONSE = 'temp_response',
  UNKNOWN = 'unknown'
}

interface Message {
  type: MessageType;
  success?: boolean;
  response?: string;
  error?: string;
}

const PORT = 3000;
const wss = new socket.Server({ port: PORT });

const send = (target: WebSocket, message: Message): void => {
  target.send(JSON.stringify(message));
}

const getAndSendTemperature = (target: WebSocket): void => {
  const handleShellCommand = (error: shell.ExecException | null, stdout: string, stderr: string): void => {
    const message = {
      type: MessageType.TEMP_RESPONSE,
      success: !(error || stderr),
      response: stdout
    } as Message;

    send(target, message);
  }

  // `temp` is an alias which returns a current temperature
  shell.exec('vcgencmd measure_temp | egrep -o "[0-9]+\.[0-9]+"', handleShellCommand);
}

const handleNewClientConnected = (ws: any): void => {
  interval(3000).pipe(
    tap(() => {
      getAndSendTemperature(ws);
    })
  ).subscribe();

  // Send intial message
  const initialMessage = { type: MessageType.CONNECTED } as Message;
  send(ws, initialMessage);

  // Send initial temperature
  getAndSendTemperature(ws);
}

// Handle new client connection
wss.on('connection', handleNewClientConnected);

// Display server status
console.log('Watching on port 3000');
