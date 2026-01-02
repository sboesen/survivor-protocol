/**
 * Time tracking and ult charge management system.
 *
 * Extracted from game.ts for better testability.
 */

/**
 * Game time state.
 */
export interface TimeState {
  /** Current frame count */
  frames: number;
  /** Time in seconds */
  time: number;
  /** Minutes survived (integer) */
  mins: number;
}

/**
 * Ult charge state.
 */
export interface UltState {
  /** Current ult charge */
  ultCharge: number;
  /** Maximum ult charge */
  ultMax: number;
  /** Whether ult is currently active */
  ultActiveTime: number;
}

/**
 * Check if time should advance (every 60 frames).
 *
 * @param frames - Current frame count
 * @returns Whether to advance time
 */
export function shouldAdvanceTime(frames: number): boolean {
  return frames % 60 === 0;
}

/**
 * Calculate game time from frames.
 *
 * @param frames - Current frame count
 * @returns Time in seconds
 */
export function calculateGameTime(frames: number): number {
  return Math.floor(frames / 60);
}

/**
 * Calculate minutes from seconds.
 *
 * @param seconds - Time in seconds
 * @returns Minutes as integer
 */
export function calculateMinutes(seconds: number): number {
  return Math.floor(seconds / 60);
}

/**
 * Calculate new time state from frame count.
 *
 * @param frames - Current frame count
 * @returns New time state
 */
export function calculateTimeState(frames: number): TimeState {
  const time = calculateGameTime(frames);
  return {
    frames,
    time,
    mins: calculateMinutes(time),
  };
}

/**
 * Calculate ult charge increment.
 * Ult charges by 5 every second (60 frames), up to max.
 *
 * @param frames - Current frame count
 * @param currentCharge - Current ult charge
 * @param maxCharge - Maximum ult charge
 * @returns New ult charge value
 */
export function calculateUltCharge(frames: number, currentCharge: number, maxCharge: number): number {
  if (!shouldAdvanceTime(frames)) {
    return currentCharge;
  }
  if (currentCharge >= maxCharge) {
    return currentCharge;
  }
  return Math.min(maxCharge, currentCharge + 5);
}

/**
 * Calculate cooldown decrement for time freeze.
 *
 * @param currentFreeze - Current time freeze frames
 * @returns New time freeze value (decremented, min 0)
 */
export function decrementTimeFreeze(currentFreeze: number): number {
  return Math.max(0, currentFreeze - 1);
}

/**
 * Calculate cooldown decrement for ult active time.
 *
 * @param currentActive - Current ult active frames
 * @returns New ult active value (decremented, min 0)
 */
export function decrementUltActiveTime(currentActive: number): number {
  return Math.max(0, currentActive - 1);
}

/**
 * Check if an aura attack frame should trigger.
 * Aura attacks happen every 20 frames.
 *
 * @param frames - Current frame count
 * @returns Whether aura attack should trigger
 */
export function shouldTriggerAuraAttack(frames: number): boolean {
  return frames % 20 === 0;
}

/**
 * Check if HUD should update.
 * HUD updates every 30 frames.
 *
 * @param frames - Current frame count
 * @returns Whether HUD should update
 */
export function shouldUpdateHud(frames: number): boolean {
  return frames % 30 === 0;
}

/**
 * Calculate fountain heal timing.
 * Fountain heals every 30 frames when in range.
 *
 * @param frames - Current frame count
 * @returns Whether fountain heal should trigger
 */
export function shouldTriggerFountainHeal(frames: number): boolean {
  return frames % 30 === 0;
}
