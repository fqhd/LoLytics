import { api_call } from './utils.js';

export async function get_game_data(MATCH_ID, key) {
	try {
		const game = await api_call(`https://europe.api.riotgames.com/lol/match/v5/matches/${MATCH_ID}?api_key=${key}`);
	
		const timeline = await api_call(`https://europe.api.riotgames.com/lol/match/v5/matches/${MATCH_ID}/timeline?api_key=${key}`);
	
		const data = { champions: [], events: [], win: game.info.participants[0].win };
	
		for (const participant of game.info.participants) {
			data.champions.push(participant.championName);
		}
	
		function is_strong_event(event) {
			return ['CHAMPION_KILL', 'BUILDING_KILL', 'ELITE_MONSTER_KILL', 'LEVEL_UP', 'ITEM_PURCHASED', 'ITEM_UNDO', 'ITEM_DESTROYED', 'ITEM_SOLD'].includes(event.type);
		}
	
		for (const frame of timeline.info.frames) {
			for (const event of frame.events) {
				if (event.type == 'CHAMPION_KILL') {
					try {
						delete event.victimDamageDealt;
						delete event.victimDamageReceived;
					} catch(e) {}
				}
				if (is_strong_event(event)) {
					data.events.push(event);
				}
			}
		}
	
		return data;
	} catch(e) {
		return null;
	}
}
