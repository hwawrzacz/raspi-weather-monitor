import { interval, Subject } from 'rxjs';
import { filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import * as socket from 'ws';
import { HardwareStatus } from './model/hardware-status';
import { Message } from './model/message';
import { MessageType } from './model/message-type';
import { HardwareStatusManager } from './hardware-status-manager';

export const APP_PORT = 3000;
export const CLIENTS_ACTIVITY_CHECK_INTERVAL = 60000 * 5; // 60000 * X means X minutes

export class HardwareMonitor {
  private readonly _wss: socket.Server;
  private readonly _hardwareStatus: HardwareStatus
  private _shellExecutor: HardwareStatusManager;
  private _clients: WebSocket[];
  private _anyClientAlive$: Subject<void>;
  private _noClientAlive$: Subject<void>;

  constructor() {
    // Initialize default values
    this._wss = new socket.Server({ port: APP_PORT });
    this._shellExecutor = new HardwareStatusManager();
    this._hardwareStatus = this._shellExecutor.hardwareStatus;
    this._clients = [];
    this._anyClientAlive$ = new Subject();
    this._noClientAlive$ = new Subject();

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
    this.sendHardwareStatus(client);
  }

  private observeAnyClientAlive(): void {
    this._anyClientAlive$.pipe(
      // Update temperature every 3 seconds
      switchMap(() => interval(5000).pipe(
        takeUntil(this._noClientAlive$),
        tap(() => this.broadcastHardwareStatus())))
    ).subscribe();
  }

  private broadcastHardwareStatus(): void {
    const hardwareStatusMessage = this.createHardwareStatusMessage();
    this.broadcast(hardwareStatusMessage);
  }

  private sendHardwareStatus(client: WebSocket): void {
    const hardwareStatusMessage = this.createHardwareStatusMessage();
    this.send(client, hardwareStatusMessage);
  }

  private broadcast<T>(message: Message<T>): void {
    this._clients.forEach(client => this.send(client, message));
  }

  private send<T>(target: WebSocket, message: Message<T>): void {
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

  //#endregion Helpers  
  private createHardwareStatusMessage(hardwareStatus: HardwareStatus = this._hardwareStatus): Message<HardwareStatus> {
    return {
      type: MessageType.HARDWARE_STATUS_RESPONSE,
      success: true,
      value: hardwareStatus
    } as Message<HardwareStatus>;
  }

  private printClientsCleanoutReport(clientsBefore: number, clientsAfter: number): void {
    const difference = clientsBefore - clientsAfter;
    if (difference === 0) return;

    console.log('\n======== Clients cleanout ========');
    console.log(`Removed ${difference} client${difference === 1 ? '' : 's'}, ${clientsAfter} client${clientsAfter === 1 ? '' : 's'} left`);
  }
  //#endregion
}