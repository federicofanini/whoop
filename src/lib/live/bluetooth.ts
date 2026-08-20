"use client";

import {
  BATTERY_LEVEL,
  BATTERY_SERVICE,
  HEART_RATE_MEASUREMENT,
  HEART_RATE_SERVICE,
  parseHeartRateMeasurement,
  type HeartRateReading,
} from "./protocol";

/**
 * Web Bluetooth client for the WHOOP heart-rate broadcast.
 *
 * Browser support is the binding constraint: Chrome and Edge on macOS implement
 * Web Bluetooth; Safari does not, on any platform, and Apple has stated no intent
 * to ship it. So this path is "Chrome on the Mac", and the native bridge exists
 * for everywhere else. The wire format either way is identical, so the dashboard
 * cannot tell which one is publishing.
 */

export type ConnectionState = "idle" | "requesting" | "connecting" | "connected" | "reconnecting" | "error";

export interface BluetoothHrEvents {
  onReading: (reading: HeartRateReading) => void;
  onStateChange: (state: ConnectionState, detail?: string) => void;
  onBattery?: (percent: number) => void;
}

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

export class HeartRateBridge {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private manualDisconnect = false;
  private reconnectAttempts = 0;

  constructor(private readonly events: BluetoothHrEvents) {}

  get deviceName(): string | null {
    return this.device?.name ?? null;
  }

  /**
   * Must be called from a user gesture — the browser will not show the device
   * chooser otherwise.
   */
  async connect(): Promise<void> {
    if (!isWebBluetoothSupported()) {
      this.events.onStateChange(
        "error",
        "This browser has no Web Bluetooth. Use Chrome or Edge on macOS, or run the native bridge.",
      );
      return;
    }

    try {
      this.manualDisconnect = false;
      this.events.onStateChange("requesting");

      // Filtering on the service rather than the name: WHOOP straps advertise
      // under several names across generations, but always expose 0x180D.
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [HEART_RATE_SERVICE] }],
        optionalServices: [BATTERY_SERVICE],
      });

      this.device = device;
      device.addEventListener("gattserverdisconnected", this.handleDisconnect);

      await this.openGatt();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection failed";
      // A cancelled chooser is a normal outcome, not an error worth shouting about.
      if (message.includes("cancelled") || message.includes("User cancelled")) {
        this.events.onStateChange("idle");
        return;
      }
      this.events.onStateChange("error", message);
    }
  }

  private async openGatt(): Promise<void> {
    if (!this.device?.gatt) throw new Error("Device has no GATT server");

    this.events.onStateChange("connecting");
    const server = await this.device.gatt.connect();

    const service = await server.getPrimaryService(HEART_RATE_SERVICE);
    const characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT);

    characteristic.addEventListener("characteristicvaluechanged", this.handleValue);
    await characteristic.startNotifications();
    this.characteristic = characteristic;

    this.reconnectAttempts = 0;
    this.events.onStateChange("connected");

    // Battery is advertised by most straps but is not mandatory; never fatal.
    void this.readBattery(server);
  }

  private async readBattery(server: BluetoothRemoteGATTServer): Promise<void> {
    try {
      const service = await server.getPrimaryService(BATTERY_SERVICE);
      const characteristic = await service.getCharacteristic(BATTERY_LEVEL);
      const value = await characteristic.readValue();
      this.events.onBattery?.(value.getUint8(0));
    } catch {
      // No battery service — nothing to report.
    }
  }

  private handleValue = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (!target.value) return;
    this.events.onReading(parseHeartRateMeasurement(target.value));
  };

  /**
   * BLE links drop constantly — walking out of range, the strap sleeping, the Mac
   * suspending. Reconnection backs off rather than hammering the radio.
   */
  private handleDisconnect = () => {
    if (this.manualDisconnect) {
      this.events.onStateChange("idle");
      return;
    }

    this.events.onStateChange("reconnecting", `Link dropped — retry ${this.reconnectAttempts + 1}`);
    const delay = Math.min(30_000, 1000 * 2 ** this.reconnectAttempts);
    this.reconnectAttempts++;

    setTimeout(() => {
      if (this.manualDisconnect) return;
      this.openGatt().catch((error) => {
        const message = error instanceof Error ? error.message : "Reconnect failed";
        if (this.reconnectAttempts >= 6) {
          this.events.onStateChange("error", `Gave up reconnecting: ${message}`);
        } else {
          this.handleDisconnect();
        }
      });
    }, delay);
  };

  async disconnect(): Promise<void> {
    this.manualDisconnect = true;

    try {
      if (this.characteristic) {
        this.characteristic.removeEventListener("characteristicvaluechanged", this.handleValue);
        await this.characteristic.stopNotifications().catch(() => undefined);
      }
      this.device?.gatt?.disconnect();
    } finally {
      this.characteristic = null;
      this.events.onStateChange("idle");
    }
  }
}
