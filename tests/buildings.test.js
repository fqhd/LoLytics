import { describe, it, expect } from 'vitest';
import { process_inhibitor_kill } from '../data/buildings.js';

describe('process_inhibitor_kill', () => {
	it('should set blue top inhibitor to 5', () => {
		const state = {
			teams: [
				{ inhibs: [0, 0, 0] },
				{ inhibs: [0, 0, 0] }
			]
		};

		const event = {
			laneType: 'TOP_LANE',
			teamId: 100
		};

		process_inhibitor_kill(state, event);
		expect(state.teams[0].inhibs).toEqual([5, 0, 0]);
	});

	it('should set red bot inhibitor to 5', () => {
		const state = {
			teams: [
				{ inhibs: [0, 0, 0] },
				{ inhibs: [0, 0, 0] }
			]
		};

		const event = {
			laneType: 'BOT_LANE',
			teamId: 200
		};

		process_inhibitor_kill(state, event);
		expect(state.teams[1].inhibs).toEqual([0, 0, 5]);
	});
});
