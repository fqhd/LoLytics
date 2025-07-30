import { api_call, deep_copy } from "./utils.js";
import { update_with_frame } from './update.js';
import { create_initial_state } from './init.js';

export async function get_game_data(MATCH_ID, key) {
	const game = await api_call(`https://europe.api.riotgames.com/lol/match/v5/matches/${MATCH_ID}?api_key=${key}`);

	const timeline = await api_call(`https://europe.api.riotgames.com/lol/match/v5/matches/${MATCH_ID}/timeline?api_key=${key}`);

	const state = create_initial_state(game);

	const states = [];
	for (const frame of timeline.info.frames) {
		update_with_frame(state, frame);
		const parsed_state = deep_copy(state);
		states.push(parsed_state);
	}
	return states;
}
