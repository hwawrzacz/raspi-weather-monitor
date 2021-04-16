import { interval } from 'rxjs';
import { switchMap, takeUntil, tap } from 'rxjs/operators';
import { HardwareStatus } from './model/hardware-status';
import { Message } from './model/message';
import { MessageType } from './model/message-type';
import { HardwareStatusManager } from './hardware-status-manager';
import { WebSocketManager } from './websocket-manager';

export class HardwareMonitor {
  private readonly appPort = 3000;
  private readonly _hardwareStatus: HardwareStatus
  private readonly _websocket: WebSocketManager;
  private _shellExecutor: HardwareStatusManager;

  constructor() {
    // Initialize default values
    this._shellExecutor = new HardwareStatusManager();
    this._websocket = new WebSocketManager(this.appPort);
    this._hardwareStatus = this._shellExecutor.hardwareStatus;

    // Handle add new client client connection
    this.handleNewClientConnected();
    this.observeAnyClientAlive();
  }

  private handleNewClientConnected(): void {
    this._websocket.newClientConnected$
      .pipe(tap((client: WebSocket) => this.sendHardwareStatus(client))
      ).subscribe();
  }

  private observeAnyClientAlive(): void {
    this._websocket.anyClientAlive$.pipe(
      // Update temperature every 5 seconds
      switchMap(() => interval(5000).pipe(
        takeUntil(this._websocket.noClientAlive$),
        tap(() => this.broadcastHardwareStatus())))
    ).subscribe();
  }

  private broadcastHardwareStatus(): void {
    const hardwareStatusMessage = this.createHardwareStatusMessage();
    this._websocket.broadcast(hardwareStatusMessage);
  }

  private sendHardwareStatus(client: WebSocket): void {
    const hardwareStatusMessage = this.createHardwareStatusMessage();
    this._websocket.send(client, hardwareStatusMessage);
  }

  //#endregion Helpers  
  private createHardwareStatusMessage(hardwareStatus: HardwareStatus = this._hardwareStatus): Message<HardwareStatus> {
    return {
      type: MessageType.HARDWARE_STATUS_RESPONSE,
      success: true,
      value: hardwareStatus
    } as Message<HardwareStatus>;
  }
  //#endregion
}