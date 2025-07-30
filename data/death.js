export function calc_death_timer(level, time) {
	const BRW = [
		6, 6, 8, 8, 10, 12, 16, 21, 26, 32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50,
		52.5,
	];
	const current_brw = BRW[level - 1];
	const current_tif = calc_tif(time) / 100;
	return current_brw + current_brw * current_tif;
}

export function calc_tif(time) {
	if (time >= 0 && time < 15) {
		return 0;
	} else if (time >= 15 && time < 30) {
		return Math.ceil(2 * (time - 15)) * 0.425;
	} else if (time >= 30 && time < 45) {
		return 12.75 + Math.ceil(2 * (time - 30)) * 0.3;
	} else if (time >= 45 && time < 55) {
		return 21.75 + Math.ceil(2 * (time - 45)) * 1.45;
	} else {
		return 50;
	}
}
