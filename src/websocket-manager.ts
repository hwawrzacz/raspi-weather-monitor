import { interval, Subject } from 'rxjs';
import { Message } from './model/message';
import * as socket from 'ws';
import { filter, tap } from 'rxjs/operators';

export const CLIENTS_ACTIVITY_CHECK_INTERVAL = 60000 * 5; // 60000 * X means X minutes

export class WebSocketManager {
  private readonly _wss: socket.Server;
  private _clients: WebSocket[];
  public newClientConnected$: Subject<WebSocket>;
  public anyClientAlive$: Subject<void>;
  public noClientAlive$: Subject<void>;

  constructor(port: number) {
    this._clients = [];
    this._wss = new socket.Server({ port: port });
    this.newClientConnected$ = new Subject<WebSocket>();
    this.anyClientAlive$ = new Subject();
    this.noClientAlive$ = new Subject();

    this.handleNewClientConnected();
    this.observeClientsActivity();

    // Display server status
    console.log(`Watching on port ${port}`);
  }

  //#region Initialization
  private handleNewClientConnected(): void {
    this._wss.on('connection', (client: WebSocket) => this.broadcastClientConnected(client));
  }

  private observeClientsActivity(): void {
    interval(CLIENTS_ACTIVITY_CHECK_INTERVAL).pipe(
      filter(() => this._clients.length > 0),
      tap(() => this.filterClientsAndPrintReport())
    ).subscribe();
  }
  //#endregion

  private broadcastClientConnected(client: WebSocket): void {
    this.newClientConnected$.next(client);
  }

  public broadcast<T>(message: Message<T>): void {
    this._clients.forEach(client => this.send(client, message));
  }

  public send<T>(target: WebSocket, message: Message<T>): void {
    target.send(JSON.stringify(message));
  }

  private filterClientsAndPrintReport(): void {
    const clientsBefore = this._clients.length;
    this._clients = this._clients.filter(client => client.readyState !== client.CLOSED);
    const clientsAfter = this._clients.length;

    if (clientsAfter === 0) {
      this.noClientAlive$.next();
    }

    this.printClientsCleanoutReport(clientsBefore, clientsAfter)
  }

  //#region Helpers
  private printClientsCleanoutReport(clientsBefore: number, clientsAfter: number): void {
    const difference = clientsBefore - clientsAfter;
    if (difference === 0) return;

    console.log('\n======== Clients cleanout ========');
    console.log(`Removed ${difference} client${difference === 1 ? '' : 's'}, ${clientsAfter} client${clientsAfter === 1 ? '' : 's'} left`);
  }
  //#endregion
}