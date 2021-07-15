import { interval } from 'rxjs';
import { switchMap, takeUntil, tap } from 'rxjs/operators';
import { Message } from './model/message';
import { MessageType } from './model/message-type';
import { WeatherManager } from './weather-manager';
import { WebSocketManager } from './websocket-manager';

export class WeatherMonitor {
  private readonly appPort = 3001;
  private readonly _weatherData: WeatherData
  private readonly _websocket: WebSocketManager;
  private _shellExecutor: WeatherManager;

  constructor() {
    // Initialize default values
    this._shellExecutor = new WeatherManager();
    this._websocket = new WebSocketManager(this.appPort);
    this._weatherData = this._shellExecutor.weatherData;

    // Handle add new client client connection
    this.handleNewClientConnected();
    this.observeAnyClientAlive();
  }

  private handleNewClientConnected(): void {
    this._websocket.newClientConnected$
      .pipe(tap((client: WebSocket) => this.sendWeatherData(client))
      ).subscribe();
  }

  private observeAnyClientAlive(): void {
    this._websocket.anyClientAlive$.pipe(
      // Update temperature every 5 seconds
      switchMap(() => interval(5000).pipe(
        takeUntil(this._websocket.noClientAlive$),
        tap(() => this.broadcastWeatherData())))
    ).subscribe();
  }

  private broadcastWeatherData(): void {
    const weatherDataMessage = this.createWeatherDataMessage();
    this._websocket.broadcast(weatherDataMessage);
  }

  private sendWeatherData(client: WebSocket): void {
    const weatherDataMessage = this.createWeatherDataMessage();
    this._websocket.send(client, weatherDataMessage);
  }

  //#endregion Helpers  
  private createWeatherDataMessage(weatherData: WeatherData = this._weatherData): Message<WeatherData> {
    return {
      type: MessageType.WEATHER_RESPONSE,
      success: true,
      value: weatherData
    } as Message<WeatherData>;
  }
  //#endregion
}