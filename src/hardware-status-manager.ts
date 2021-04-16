import * as shell from 'child_process';
import { interval } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HardwareStatus } from './model/hardware-status';

export interface ShellCommand {
  success: boolean;
  result: string;
  error: string;
}

export class HardwareStatusManager {
  //#region Commands
  private readonly READ_RAM_USAGE_WINDOWS_MOCK = 'echo 3874 187';
  private readonly READ_CPU_TEMPERATURE_WINDOWS_MOCK = 'echo 45';
  private readonly READ_CPU_USAGE_WINDOWS_MOCK = 'echo 92.9 id';
  /** Gets the CPU temperature, for example: 47.2 */
  private readonly READ_CPU_TEMPERATURE_RASPBERRY = 'vcgencmd measure_temp | egrep -o "[0-9]+\.[0-9]+"';
  /** Gets total and free RAM in megabytes, for example: 3789 165 */
  private readonly READ_RAM_USAGE_RASPBERRY = 'free -m | egrep "[0-9]+" -o | head -n 2 | tr "\n" " " | egrep "[0-9]+ [0-9]+"';
  /** Gets the idle CPU percentage, for example: 96.2 id */
  private readonly READ_CPU_USAGE_RASPBERRY = 'top -n1 | head -n 3 | egrep "\%Cpu\(s\)" | tr "," "\n" | egrep "[0-9]+\.[0-9]+.+(id)"';

  private readonly READ_CPU_TEMPERATURE = this.READ_CPU_TEMPERATURE_RASPBERRY;
  private readonly READ_RAM_USAGE = this.READ_RAM_USAGE_RASPBERRY;
  private readonly READ_CPU_USAGE = this.READ_CPU_USAGE_RASPBERRY;
  // private readonly READ_CPU_TEMPERATURE = this.READ_CPU_TEMPERATURE_WINDOWS_MOCK;
  // private readonly READ_RAM_USAGE = this.READ_RAM_USAGE_WINDOWS_MOCK;
  // private readonly READ_CPU_USAGE = this.READ_CPU_USAGE_WINDOWS_MOCK;
  //#endregion

  private _hardwareStatus: HardwareStatus;

  //#region Getters and setters
  get hardwareStatus(): HardwareStatus {
    return this._hardwareStatus;
  }
  //#endregion

  constructor() {
    this._hardwareStatus = {
      cpuTemp: 0,
      cpuLoad: 0,
      ramTotal: 0,
      ramUsed: 0,
    }

    this.startWatchingStatus();
  }

  private startWatchingStatus(): void {
    interval(5000).pipe(
      tap(() => {
        this.readAndUpdateCpuTemperature();
        this.readAndUpdateRamUsage();
        this.readAndUpdateCpuUsage();
      })
    ).subscribe();
  }

  private readAndUpdateCpuTemperature(): void {
    const handleCommandResult = (error: shell.ExecException | null, stdout: string, stderr: string): void => {
      const commandExecution = this.createShellCommand(error, stdout, stderr);
      if (commandExecution.success) {
        const temperature = parseInt(commandExecution.result);

        this._hardwareStatus.cpuTemp = temperature;
      }
    }
    shell.exec(this.READ_CPU_TEMPERATURE, handleCommandResult);
  }

  private readAndUpdateRamUsage(): void {
    const handleCommandResult = (error: shell.ExecException | null, stdout: string, stderr: string): void => {
      const commandExecution = this.createShellCommand(error, stdout, stderr);
      if (commandExecution.success) {
        const ramUsageString = commandExecution.result;
        const [ramTotal, ramUsed] = ramUsageString.split(' ').map(val => parseInt(val));

        this._hardwareStatus.ramTotal = ramTotal;
        this._hardwareStatus.ramUsed = ramUsed;
      }
    }
    shell.exec(this.READ_RAM_USAGE, handleCommandResult);
  }

  private readAndUpdateCpuUsage(): void {
    const handleCommandResult = (error: shell.ExecException | null, stdout: string, stderr: string): void => {
      const commandExecution = this.createShellCommand(error, stdout, stderr);
      if (commandExecution.success) {
        const cpuIdle = parseInt(commandExecution.result.split(' ')[0]);
        const cpuLoad = 100 - cpuIdle;
        this._hardwareStatus.cpuLoad = cpuLoad;
      }
    }
    shell.exec(this.READ_CPU_USAGE, handleCommandResult);
  }

  private createShellCommand(error: shell.ExecException | null, stdout: string, stderr: string): ShellCommand {
    return {
      success: !(error || stderr),
      result: stdout,
      error: error || stderr
    } as ShellCommand;
  }
}