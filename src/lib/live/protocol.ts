/**
 * The Bluetooth Heart Rate Service, as WHOOP broadcasts it.
 *
 * Turning on Heart Rate Broadcast in the WHOOP app exposes the standard
 * SIG-defined service — the same one Polar, Garmin and Wahoo straps expose, which
 * is why Zwift and Peloton can read a WHOOP without knowing anything about WHOOP.
 * That standardisation is the whole reason live HR is possible at all: the WHOOP
 * REST API has no continuous heart-rate endpoint.
 */

export const HEART_RATE_SERVICE = 0x180d;
export const HEART_RATE_MEASUREMENT = 0x2a37;
export const BODY_SENSOR_LOCATION = 0x2a38;
export const BATTERY_SERVICE = 0x180f;
export const BATTERY_LEVEL = 0x2a19;

export interface HeartRateReading {
  bpm: number;
  /** RR intervals in milliseconds. Present only if the strap reports them. */
  rrIntervals: number[];
  /** Cumulative kJ since the session started, when reported. */
  energyExpended: number | null;
  contactDetected: boolean | null;
  at: number;
}

/**
 * Decodes a Heart Rate Measurement characteristic value.
 *
 * Layout (Bluetooth SIG, HRS 1.0):
 *   byte 0 — flags
 *     bit 0  : 0 = uint8 BPM, 1 = uint16 BPM
 *     bit 1-2: sensor contact (bit 2 = supported, bit 1 = detected)
 *     bit 3  : energy expended field present
 *     bit 4  : RR interval field(s) present
 *   then BPM, then optional energy (uint16), then RR intervals (uint16 each).
 *
 * RR intervals arrive in units of 1/1024 second, not milliseconds — a detail
 * that silently corrupts HRV by about 2.4% if missed.
 */
export function parseHeartRateMeasurement(view: DataView): HeartRateReading {
  const flags = view.getUint8(0);
  const is16Bit = (flags & 0x01) !== 0;
  const contactSupported = (flags & 0x04) !== 0;
  const contactDetected = (flags & 0x02) !== 0;
  const hasEnergy = (flags & 0x08) !== 0;
  const hasRr = (flags & 0x10) !== 0;

  let offset = 1;

  const bpm = is16Bit ? view.getUint16(offset, true) : view.getUint8(offset);
  offset += is16Bit ? 2 : 1;

  let energyExpended: number | null = null;
  if (hasEnergy) {
    energyExpended = view.getUint16(offset, true);
    offset += 2;
  }

  const rrIntervals: number[] = [];
  if (hasRr) {
    while (offset + 1 < view.byteLength) {
      const raw = view.getUint16(offset, true);
      rrIntervals.push((raw / 1024) * 1000);
      offset += 2;
    }
  }

  return {
    bpm,
    rrIntervals,
    energyExpended,
    contactDetected: contactSupported ? contactDetected : null,
    at: Date.now(),
  };
}

/** What travels over the wire to every subscribed dashboard. */
export interface LiveHrMessage {
  sessionId: string;
  bpm: number;
  rrIntervals: number[];
  energyExpended: number | null;
  at: number;
  deviceName: string | null;
}

export const LIVE_HR_CHANNEL = "whoop-live-hr";
export const LIVE_HR_EVENT = "reading";
