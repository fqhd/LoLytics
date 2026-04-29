import { get_game_data } from './game.js';
import fs from 'fs';
import { shuffle, sleep, parse_env_file } from './utils.js';

fs.mkdirSync('dataset', { recursive: true });
fs.mkdirSync('dataset/train', { recursive: true });
fs.mkdirSync('dataset/test', { recursive: true });

const env = parse_env_file('.env');

const match_data = fs.readFileSync('match_ids.csv', 'utf8');
const lines = match_data.split('\n');

lines.pop();

shuffle(lines);

const BATCH_SIZE = 25;

const TEST_SPLIT = process.argv[2];
if (!TEST_SPLIT) {
    console.error('Test split must be defined');
    process.exit(-1);
}
if (TEST_SPLIT > 1) {
    console.error('Test split must be less than 1');
    process.exit(-1);
} else if (TEST_SPLIT < 0) {
    console.error('Test split must be greater than 0');
    process.exit(-1);
}
const TEST_SIZE = parseInt(lines.length * TEST_SPLIT);
console.log(`Downloading dataset with ${TEST_SIZE} test samples`);

async function download_games(rows, split) {
    let promises = [];

    for (let i = 0; i < rows.length; i++) {
        const line = rows[i];

        const [match_id, rank, tier] = line.split(',');

        promises.push((async () => {
            const data = await get_game_data(match_id, env.RIOT_KEY);
            if (data != null) {
                fs.mkdirSync(`dataset/${split}/${rank}`, { recursive: true });
                fs.mkdirSync(`dataset/${split}/${rank}/${tier}`, { recursive: true });
                fs.writeFileSync(`dataset/${split}/${rank}/${tier}/${match_id}.json`, JSON.stringify(data), 'utf8');
            }
        })());

        if (promises.length >= BATCH_SIZE) {
            const progress = parseInt((i / rows.length) * 100);
            console.log(`Progress(${split}): ${progress}%`);

            await sleep(1300);
            await Promise.all(promises);
            promises = [];
        }
    }
    
    if (promises.length > 0) {
        await Promise.all(promises);
    }
}

await download_games(lines.slice(0, TEST_SIZE), 'test');
await download_games(lines.slice(TEST_SIZE), 'train');
