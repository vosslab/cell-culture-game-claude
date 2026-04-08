// ============================================
// core/util.ts - Shared utilities for the engine
// ============================================

// Clamp a numeric value to [min, max] range
// Used on all bounded numeric mutations to prevent overflow/underflow
export function clampValue(value: number, minimum: number, maximum: number): number {
	return Math.max(minimum, Math.min(maximum, value));
}
