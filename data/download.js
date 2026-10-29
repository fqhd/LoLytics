import fs from 'fs';
import readline from 'readline';
import { get_game_data } from './game.js';
import { shuffle, sleep, parse_env_file } from './utils.js';

fs.mkdirSync('dataset', { recursive: true });
fs.mkdirSync('dataset/train_bin', { recursive: true });
fs.mkdirSync('dataset/test_bin', { recursive: true });

const env = parse_env_file('.env');

const match_data = fs.readFileSync('match_ids.csv', 'utf8');
const lines = match_data.split('\n');
lines.pop();

shuffle(lines);

const BATCH_SIZE = 25;

const TEST_SPLIT = parseFloat(process.argv[2]);
if (!TEST_SPLIT) {
    console.error('Test split must be defined');
    process.exit(-1);
}
if (TEST_SPLIT >= 1) {
    console.error('Test split must be less than 1');
    process.exit(-1);
}
if (TEST_SPLIT <= 0) {
    console.error('Test split must be greater than 0');
    process.exit(-1);
}
const TEST_SIZE = parseInt(lines.length * TEST_SPLIT);
console.log(`Downloading dataset with ${TEST_SIZE} test samples`);

// ────────────────────────────────────────────────────────────────────
// CSV helpers (from hydrate.js)
// ────────────────────────────────────────────────────────────────────
const COLUMNS = [
    'matchid', 'rank', 'gameDuration', 'gameStartTimestamp',
    'championName', 'role', 'side',
    'damageDealtToChampions', 'damageDealtToBuildings', 'damageDealtToObjectives',
    'kills', 'deaths', 'assists', 'level', 'experience', 'gold', 'summonerLevel',
    'visionScore', 'totalHealsOnTeammates', 'totalDamageShieldedOnTeammates',
    'timeCCingOthers', 'win',
];

function csvEscape(v) {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
}

function formatRank(tierName, division) {
    if (!tierName) return '';
    if (['CHALLENGER', 'GRANDMASTER', 'MASTER'].includes(tierName)) return tierName;
    return `${tierName}${division}`;
}

function extractRows(match, rankLabel) {
    const rows = [];
    const gameDuration       = match.info.gameDuration;
    const gameStartTimestamp = match.info.gameStartTimestamp;
    for (const p of match.info.participants) {
        rows.push([
            match.metadata.matchId,
            rankLabel,
            gameDuration,
            gameStartTimestamp,
            p.championName,
            p.teamPosition || '',
            p.teamId === 100 ? 'blue' : 'red',
            p.totalDamageDealtToChampions,
            p.damageDealtToBuildings,
            p.damageDealtToObjectives,
            p.kills,
            p.deaths,
            p.assists,
            p.champLevel,
            p.champExperience,
            p.goldEarned,
            p.summonerLevel,
            p.visionScore,
            p.totalHealsOnTeammates,
            p.totalDamageShieldedOnTeammates,
            p.timeCCingOthers,
            p.win,
        ].map(csvEscape).join(','));
    }
    return rows;
}

async function loadAlreadyDone(path) {
    const done = new Set();
    if (!fs.existsSync(path)) return done;
    const rl = readline.createInterface({ input: fs.createReadStream(path) });
    let first = true;
    for await (const line of rl) {
        if (first) { first = false; continue; }
        const idx = line.indexOf(',');
        if (idx > 0) done.add(line.slice(0, idx));
    }
    return done;
}

const alreadyDone = await loadAlreadyDone('games.csv');
console.log(`Already in games.csv: ${alreadyDone.size}`);

const append = alreadyDone.size > 0;
const csvStream = fs.createWriteStream('games.csv', { flags: append ? 'a' : 'w' });
if (!append) csvStream.write(COLUMNS.join(',') + '\n');

let csvChain = Promise.resolve();
function writeCsv(data) {
    csvChain = csvChain.then(() => new Promise(r => {
        if (csvStream.write(data)) r();
        else csvStream.once('drain', r);
    }));
    return csvChain;
}

// ────────────────────────────────────────────────────────────────────
// Download loop
// ────────────────────────────────────────────────────────────────────
async function download_games(rows, split) {
    let promises = [];
    let last_progress = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
        const line = rows[i];
        const [match_id, tierName, division] = line.split(',');
        if (!match_id) continue;

        const binDir  = `dataset/${split}_bin/${tierName}/${division}`;
        const binPath = `${binDir}/${match_id}.bin`;

        // Skip if either the CSV or the binary already records this match.
        if (alreadyDone.has(match_id) || fs.existsSync(binPath)) {
            skipped++;
            continue;
        }

        promises.push((async () => {
            const result = await get_game_data(match_id, env.RIOT_KEY);
            if (result != null) {
                // Binary first, CSV second — a crash between the two leaves
                // an orphan binary which is safely re-written on resume.
                fs.mkdirSync(binDir, { recursive: true });
                fs.writeFileSync(binPath, result.binary);

                const rankLabel = formatRank(tierName, division);
                const csvRows   = extractRows(result.match, rankLabel);
                await writeCsv(csvRows.join('\n') + '\n');
            }
        })());

        if (promises.length >= BATCH_SIZE) {
            const progress = parseInt((i / rows.length) * 100);
            if (progress != last_progress) {
                last_progress = progress;
                console.log(`Progress(${split}): ${progress}%`);
            }
            await sleep(1300);
            await Promise.all(promises);
            promises = [];
        }
    }

    if (promises.length > 0) {
        await Promise.all(promises);
    }
    if (skipped > 0) {
        console.log(`Skipped ${skipped} already-downloaded ${split} matches`);
    }
}

await download_games(lines.slice(0, TEST_SIZE), 'test');
await download_games(lines.slice(TEST_SIZE), 'train');

await writeCsv('');
await new Promise(r => csvStream.end(r));
console.log('Done.');