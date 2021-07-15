import * as shell from 'child_process';
import { interval } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface ShellCommand {
  success: boolean;
  result: string;
  error: string;
}

export class WeatherManager {
  //#region Commands
  private readonly READ_WEATHER_WINDOWS_MOCK = 'echo 23.9612019609;943.062742733;58.3099279023';
  /** Gets the weater data: temperature, pressure and humidity for example: 23.9612019609;943.062742733;58.3099279023 */
  private readonly READ_WEATHER_RASPBERRY = 'python ~/Projects/indoor-temperature-monitor/indoor-temperature.py';

  private readonly READ_WEATHER = this.READ_WEATHER_RASPBERRY;
  // private readonly READ_CPU_TEMPERATURE = this.READ_WEATHER_WINDOWS_MOCK;
  //#endregion

  private _weatherData: WeatherData;

  //#region Getters and setters
  get weatherData(): WeatherData {
    return this._weatherData;
  }
  //#endregion

  constructor() {
    this._weatherData = {} as WeatherData

    this.startWatchingStatus();
  }

  private startWatchingStatus(): void {
    interval(5000).pipe(
      tap(() => {
        this.readAndUpdateWeather();
      })
    ).subscribe();
  }

  private readAndUpdateWeather(): void {
    const handleCommandResult = (error: shell.ExecException | null, stdout: string, stderr: string): void => {
      const commandExecution = this.createShellCommand(error, stdout, stderr);
      if (commandExecution.success) {
        const [temperature, humidity, pressure] = commandExecution.result.split(';');

        this._weatherData.temperature = +parseFloat(temperature).toFixed(2);
        this._weatherData.pressure = +parseFloat(pressure).toFixed(2);
        this._weatherData.humidity = +parseFloat(humidity).toFixed(2);
      }
    }
    shell.exec(this.READ_WEATHER, handleCommandResult);
  }

  private createShellCommand(error: shell.ExecException | null, stdout: string, stderr: string): ShellCommand {
    return {
      success: !(error || stderr),
      result: stdout,
      error: error || stderr
    } as ShellCommand;
  }
}
