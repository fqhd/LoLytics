import { describe, it, expect } from 'vitest';
import { calc_death_timer, calc_tif } from '../data/death.js';

describe('calc_tif', () => {
	it('should return 0 for time less than 15', () => {
		expect(calc_tif(0)).toBe(0);
		expect(calc_tif(14.9)).toBe(0);
	});

	it('should calculate TIF between 15 and 30 minutes', () => {
		expect(calc_tif(15)).toBe(0);
		expect(calc_tif(15.5)).toBe(0.425);
		expect(calc_tif(16)).toBe(0.85); // ceil(2 * 1) * 0.425 = 0.85
		expect(calc_tif(29.9)).toBe(Math.ceil(2 * (29.9 - 15)) * 0.425);
	});

	it('should calculate TIF between 30 and 45 minutes', () => {
		expect(calc_tif(30)).toBe(12.75);
		expect(calc_tif(30.5)).toBe(12.75 + 0.3);
		expect(calc_tif(44.9)).toBe(12.75 + Math.ceil(2 * (44.9 - 30)) * 0.3);
	});

	it('should calculate TIF between 45 and 55 minutes', () => {
		expect(calc_tif(45)).toBe(21.75);
		expect(calc_tif(45.5)).toBe(21.75 + 1.45);
		expect(calc_tif(54.9)).toBe(21.75 + Math.ceil(2 * (54.9 - 45)) * 1.45);
	});

	it('should return 50 for time >= 55', () => {
		expect(calc_tif(55)).toBe(50);
		expect(calc_tif(70)).toBe(50);
	});
});

describe('calc_death_timer', () => {
	it('should correctly calculate death timer at level 1 and time 0', () => {
		const brw = 6;
		const tif = calc_tif(0) / 100;
		const expected = brw + brw * tif;
		expect(calc_death_timer(1, 0)).toBeCloseTo(expected);
	});

	it('should correctly calculate death timer at level 10 and time 25', () => {
		const brw = 32.5;
		const tif = calc_tif(25) / 100;
		const expected = brw + brw * tif;
		expect(calc_death_timer(10, 25)).toBeCloseTo(expected);
	});

	it('should correctly calculate death timer at level 18 and time 60', () => {
		const brw = 52.5;
		const tif = calc_tif(60) / 100;
		const expected = brw + brw * tif;
		expect(calc_death_timer(18, 60)).toBeCloseTo(expected);
	});
});
