/**
 * Heart-rate maths for the live session view.
 *
 * The BLE Heart Rate Service optionally reports RR intervals — the gap between
 * consecutive beats — which is the raw material HRV is computed from. When the
 * strap sends them, real-time HRV is available; when it does not, only BPM is.
 */

/**
 * RMSSD: the root mean square of successive RR differences.
 *
 * This is the same metric WHOOP reports as "HRV", so a live figure is directly
 * comparable to the morning reading — though a waking, moving RMSSD will always
 * read far lower than one taken during slow-wave sleep, which is when WHOOP
 * measures it.
 */
export function rmssd(rrIntervals: number[]): number | null {
  const clean = filterArtifacts(rrIntervals);
  if (clean.length < 3) return null;

  let sumSquares = 0;
  for (let i = 1; i < clean.length; i++) {
    sumSquares += (clean[i] - clean[i - 1]) ** 2;
  }
  return Math.sqrt(sumSquares / (clean.length - 1));
}

/** SDNN: plain standard deviation of the intervals. Slower-moving companion to RMSSD. */
export function sdnn(rrIntervals: number[]): number | null {
  const clean = filterArtifacts(rrIntervals);
  if (clean.length < 3) return null;

  const m = clean.reduce((a, b) => a + b, 0) / clean.length;
  const variance = clean.reduce((acc, v) => acc + (v - m) ** 2, 0) / (clean.length - 1);
  return Math.sqrt(variance);
}

/**
 * Drops physiologically impossible intervals and ectopic beats.
 *
 * A dropped or doubled beat shows up as an interval that jumps more than 20% from
 * its neighbour, and squaring successive differences means a single artifact can
 * double the RMSSD. Filtering is not optional for a usable live number.
 */
export function filterArtifacts(rrIntervals: number[]): number[] {
  // 300-2000ms covers 30-200 bpm; anything outside is a sensor error.
  const plausible = rrIntervals.filter((rr) => rr >= 300 && rr <= 2000);
  if (plausible.length < 2) return plausible;

  const out: number[] = [plausible[0]];
  for (let i = 1; i < plausible.length; i++) {
    const previous = out[out.length - 1];
    if (Math.abs(plausible[i] - previous) / previous <= 0.2) {
      out.push(plausible[i]);
    }
  }
  return out;
}

/**
 * Live strain accumulation.
 *
 * WHOOP's strain is a proprietary 0-21 logarithmic scale built on time spent in
 * each heart-rate zone. This reimplements the *shape* of it — weighted zone
 * minutes compressed logarithmically and calibrated so a hard hour lands near 15
 * — so the live number tracks sensibly during a session. It will not match the
 * score WHOOP posts afterwards, and the UI says so.
 */
export function estimateStrain(zoneSecondsByZone: number[], maxHr: number): number {
  void maxHr;
  // Zones 1-5. Higher zones cost disproportionately more, hence the exponential weights.
  const weights = [1, 1.8, 3.2, 5.8, 10.5];

  let weighted = 0;
  for (let i = 0; i < Math.min(zoneSecondsByZone.length, weights.length); i++) {
    weighted += (zoneSecondsByZone[i] / 60) * weights[i];
  }

  if (weighted <= 0) return 0;

  // ln-compression calibrated so ~60 weighted minutes reads ≈ 15.
  const strain = 6.5 * Math.log(1 + weighted / 8);
  return Math.min(21, Math.max(0, strain));
}

/** Standard age-predicted maximum, used only when WHOOP has not supplied one. */
export function estimateMaxHr(age: number): number {
  return Math.round(208 - 0.7 * age);
}
