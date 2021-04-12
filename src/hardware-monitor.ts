import * as socket from 'ws';
import * as shell from 'child_process';
import { interval, Subject } from 'rxjs';
import { filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { Message } from './model/message';
import { MessageType } from './model/message-type';

export const APP_PORT = 3000;
export const CLIENTS_ACTIVITY_CHECK_INTERVAL = 60000 * 1; // 60000 * X means X minutes

export class HardwareMonitor {
  private readonly RASPBERRY_SHELL_COMMAND = 'vcgencmd measure_temp | egrep -o "[0-9]+\.[0-9]+"';
  private readonly WINDOWS_SHELL_COMMAND = 'ls';
  private readonly SHELL_COMMAND = this.RASPBERRY_SHELL_COMMAND;
  private _clients: WebSocket[] = [];
  private readonly _wss = new socket.Server({ port: APP_PORT });
  private _anyClientAlive$ = new Subject();
  private _noClientAlive$ = new Subject();

  constructor() {
    // Handle add new client client connection
    this._wss.on('connection', (client: WebSocket) => this.handleNewClientConnected(client));

    this.observeAnyClientAlive();
    this.observeClientsActivity();

    // Display server status
    console.log('Watching on port 3000');
  }

  private handleNewClientConnected(client: WebSocket): void {
    if (this._clients.length === 0) {
      this._anyClientAlive$.next();
    }
    this._clients.push(client);
    this.getAndSendTemperature(client);
  }

  private observeAnyClientAlive(): void {
    this._anyClientAlive$.pipe(
      // Update temperature every 3 seconds
      switchMap(() => interval(3000).pipe(
        takeUntil(this._noClientAlive$),
        tap(() => this.getAndBroadcastTemperature())))
    ).subscribe();
  }

  private getAndBroadcastTemperature(): void {
    const handleShellCommand = (error: shell.ExecException | null, stdout: string, stderr: string): void => {
      const message = this.createTempResponseMessage(error, stdout, stderr);
      this.broadcast(message);
    }
    shell.exec(this.SHELL_COMMAND, handleShellCommand);
  }

  private getAndSendTemperature(client: WebSocket): void {
    const handleShellCommand = (error: shell.ExecException | null, stdout: string, stderr: string): void => {
      const message = this.createTempResponseMessage(error, stdout, stderr);
      this.send(client, message);
    }
    shell.exec(this.SHELL_COMMAND, handleShellCommand);
  }

  private createTempResponseMessage(error: shell.ExecException | null, stdout: string, stderr: string): Message {
    return {
      type: MessageType.TEMP_RESPONSE,
      success: !(error || stderr),
      response: stdout
    } as Message;
  }

  private broadcast(message: Message): void {
    this._clients.forEach(client => this.send(client, message));
  }

  private send(target: WebSocket, message: Message): void {
    target.send(JSON.stringify(message));
  }

  private observeClientsActivity(): void {
    interval(CLIENTS_ACTIVITY_CHECK_INTERVAL).pipe(
      filter(() => this._clients.length > 0),
      tap(() => this.filterClientsAndPrintReport())
    ).subscribe();
  }

  private filterClientsAndPrintReport(): void {
    const clientsBefore = this._clients.length;
    this._clients = this._clients.filter(client => client.readyState !== client.CLOSED);
    const clientsAfter = this._clients.length;
    if (clientsAfter === 0) {
      this._noClientAlive$.next();
    }
    this.printClientsCleanoutReport(clientsBefore, clientsAfter)

  }

  private printClientsCleanoutReport(clientsBefore: number, clientsAfter: number): void {
    const difference = clientsBefore - clientsAfter;
    if (difference === 0) return;

    console.log('\n======== Clients cleanout ========');
    console.log(`Removed ${difference} client${difference === 1 ? '' : 's'}, ${clientsAfter} client${clientsAfter === 1 ? '' : 's'} left`);
  }
}