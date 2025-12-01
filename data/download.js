import { get_game_data } from './game.js';
import fs from 'fs';
import { API_KEYS } from './api_keys.js';
import { shuffle } from './utils.js';

fs.mkdirSync('dataset', { recursive: true });
fs.mkdirSync('dataset/train', { recursive: true });
fs.mkdirSync('dataset/test', { recursive: true });

const match_data = fs.readFileSync('match_ids.csv', 'utf8');
const lines = match_data.split('\n');

shuffle(lines);

const TEST_SPLIT = 100_000;

async function download_games(rows, split) {
	let promises = [];
	let elos = [];
	let index = 0;

	for (const line of rows) {
		const [match_id, rank, tier] = line.split(',');
	
		promises.push(get_game_data(match_id, API_KEYS[promises.length]));
		elos.push({rank, tier});
		if (promises.length >= API_KEYS.length) {
			const results = await Promise.all(promises);
			results.forEach((game, i) => {
				if (game != null) {
					fs.mkdirSync(`dataset/${split}/${elos[i].rank}`, { recursive: true });
					if (elos[i].rank == 'MASTER') {
						fs.writeFileSync(`dataset/${split}/${elos[i].rank}/game_${index}.json`, JSON.stringify(game), 'utf8');
					} else {
						fs.mkdirSync(`dataset/${split}/${elos[i].rank}/${elos[i].tier}`, { recursive: true });
						fs.writeFileSync(`dataset/${split}/${elos[i].rank}/${elos[i].tier}/game_${index}.json`, JSON.stringify(game), 'utf8');
					}
					index++;
				}
			});
			promises = [];
			elos = [];
		}
	}
	
	if (promises.length > 0) {
		const results = await Promise.all(promises);
		results.forEach((game, i) => {
			if (game != null) {
				fs.mkdirSync(`dataset/${split}/${elos[i].rank}`, { recursive: true });
				if (elos[i].rank == 'MASTER') {
					fs.writeFileSync(`dataset/${split}/${elos[i].rank}/game_${index}.json`, JSON.stringify(game), 'utf8');
				} else {
					fs.mkdirSync(`dataset/${split}/${elos[i].rank}/${elos[i].tier}`, { recursive: true });
					fs.writeFileSync(`dataset/${split}/${elos[i].rank}/${elos[i].tier}/game_${index}.json`, JSON.stringify(game), 'utf8');
				}
				index++;
			}
		});
	}

}

await download_games(lines.slice(0, TEST_SPLIT), 'test');
await download_games(lines.slice(TEST_SPLIT), 'train');