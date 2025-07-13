import { PowerState, SystemCapabilities } from './types';
import { Logger } from '../core/logger';
import { EventThrottler } from '../core/event-throttler';

export class PowerManagementService {
  private logger: Logger;
  private throttler: EventThrottler;
  private battery?: any;
  private isInitialized = false;

  constructor(logger: Logger, throttler: EventThrottler) {
    this.logger = logger;
    this.throttler = throttler;
  }

  async initialize(capabilities: SystemCapabilities): Promise<void> {
    if (!capabilities.powerManagement || this.isInitialized) return;

    try {
      this.battery = await navigator.getBattery();
      if (this.battery) {
        const throttledUpdate = this.throttler.throttle(
          'battery-update',
          () => this.onBatteryChange(),
          1000
        );
        this.battery.addEventListener('levelchange', throttledUpdate);
        this.battery.addEventListener('chargingchange', throttledUpdate);
        this.isInitialized = true;

        this.logger.info('Power management initialized', {
          component: 'PowerManagementService',
          action: 'initialize'
        });
      }
    } catch (error) {
      this.logger.error('Failed to initialize power management', {
        component: 'PowerManagementService',
        action: 'initialize',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private onBatteryChange(): void {
    this.logger.debug('Battery status changed', {
      component: 'PowerManagementService',
      action: 'onBatteryChange',
      metadata: {
        level: this.battery?.level,
        charging: this.battery?.charging
      }
    });
  }

  getPowerState(): PowerState | null {
    if (!this.battery) return null;

    return {
      isCharging: this.battery.charging,
      batteryLevel: this.battery.level * 100,
      timeRemaining: this.battery.dischargingTime > 0 ? this.battery.dischargingTime / 1000 : undefined,
      powerMode: 'balanced' // Default, could be enhanced with actual detection
    };
  }

  getBatteryInfo() {
    if (!this.battery) return null;

    return {
      level: this.battery.level * 100,
      charging: this.battery.charging,
      timeRemaining: this.battery.dischargingTime > 0 ? this.battery.dischargingTime / 1000 : undefined,
    };
  }
}