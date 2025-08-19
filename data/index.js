import { get_game_data } from './game.js';
import fs from 'fs';
import { API_KEYS } from './api_keys.js';
import { get_ids } from './get_match_ids.js';

async function get_batch(match_ids) {
	const promises = [];
	for (let i = 0; i < match_ids.length; i++) {
		promises.push(get_game_data(match_ids[i], API_KEYS[i]));
	}
	try {
		const results = await Promise.all(promises);
		return results.filter((e) => e != null);
	} catch (e) {
		console.log(e);
		return [];
	}
}

async function download_games(rank) {
	let match_ids = await get_ids(rank);
	match_ids = new Set(match_ids);
	match_ids = Array.from(match_ids);

	console.log(`Processing ${match_ids.length} matches`);

	let idx = 0;
	for (let i = 0; i < match_ids.length; i += API_KEYS.length) {
		let batch = await get_batch(match_ids.slice(i, i + API_KEYS.length));
		for (const game of batch) {
			idx++;
			fs.writeFileSync(
				`match_data/${rank}/game_${idx}.json`,
				JSON.stringify(game)
			);
		}
		console.log(`Processed ${idx} matches`);
	}
}

async function main() {
	const ranks = ['PLATINUM', 'EMERALD', 'DIAMOND'];

	fs.mkdirSync(`match_data`);
	for (const rank of ranks) {
		fs.mkdirSync(`match_data/${rank}`);
		try {
			await download_games(rank);
		} catch (e) {
			console.log(e);
		}
	}
}

main();
