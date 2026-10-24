import fs from 'fs';
import readline from 'readline';
import { parse_env_file, sleep } from './utils.js';

const env      = parse_env_file('.env');
const API_KEY  = env.RIOT_KEY;
const EUROPE   = 'https://europe.api.riotgames.com';

// ─────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────
const CONCURRENCY = 16;
const SAFETY      = 0.75;        // use 75 % of discovered method limit

// App-level: 70 % of your real quota (500/10s, 30000/10min)
const APP_LIMITS = [
    { limit: 350,    windowMs: 10_000 },
    { limit: 21_000, windowMs: 600_000 },
];

// Conservative bootstrap until X-Method-Rate-Limit is seen
const DEFAULT_METHOD_LIMITS = [
    { limit: 5, windowMs: 10_000 },
];

const COLUMNS = [
    'matchid', 'rank', 'gameDuration', 'gameStartTimestamp',
    'championName', 'role', 'side',
    'damageDealtToChampions', 'damageDealtToBuildings', 'damageDealtToObjectives',
    'kills', 'deaths', 'assists', 'level', 'experience', 'gold', 'summonerLevel',
    'visionScore', 'totalHealsOnTeammates', 'totalDamageShieldedOnTeammates',
    'timeCCingOthers', 'win',
];

// ─────────────────────────────────────────────────────────────────────
// Sliding-window limiter (same as before, plus header sync)
// ─────────────────────────────────────────────────────────────────────
function parseHeader(header) {
    if (!header) return [];
    const out = [];
    for (const part of header.split(',')) {
        const [a, b] = part.trim().split(':').map(Number);
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
        out.push({ count: a, windowMs: b * 1000 });
    }
    return out;
}

class SlidingWindow {
    constructor(limits) {
        this.windows = limits.map(l => ({ limit: l.limit, windowMs: l.windowMs, ts: [] }));
        this.pauseUntil = 0;
    }
    async acquire() {
        while (true) {
            const now = Date.now();
            if (now < this.pauseUntil) {
                await sleep(Math.min(this.pauseUntil - now + 20, 2_000));
                continue;
            }
            let maxWait = 0;
            let ok = true;
            for (const w of this.windows) {
                const cut = now - w.windowMs;
                while (w.ts.length && w.ts[0] < cut) w.ts.shift();
                if (w.ts.length >= w.limit) {
                    ok = false;
                    maxWait = Math.max(maxWait, w.ts[0] + w.windowMs - now + 10);
                }
            }
            if (ok) {
                for (const w of this.windows) w.ts.push(now);
                return;
            }
            await sleep(Math.max(maxWait, 20));
        }
    }
    pause(ms) { this.pauseUntil = Math.max(this.pauseUntil, Date.now() + ms); }

    /** Replace limits using the header, preserving already-counted timestamps. */
    updateFromHeader(header) {
        const limits = parseHeader(header);
        if (limits.length === 0) return;
        const old = this.windows;
        this.windows = limits.map(l => ({
            limit:    Math.max(1, Math.floor(l.count * SAFETY)),
            windowMs: l.windowMs,
            ts:       old.find(w => w.windowMs === l.windowMs)?.ts.slice() || [],
        }));
    }
}

const appLimiter   = new SlidingWindow(APP_LIMITS);
const methodBucket = new Map();

function bucketFor(url) {
    const u = new URL(url);
    // Normalise matchId out of the path so all by-matchId calls share one bucket
    const key = `${u.host}${u.pathname.replace(/\/matches\/[A-Z0-9_]+$/i, '/matches/{matchId}')}`;
    let b = methodBucket.get(key);
    if (!b) {
        b = new SlidingWindow(DEFAULT_METHOD_LIMITS);
        b.key        = key;
        b.discovered = false;
        methodBucket.set(key, b);
    }
    return b;
}

// ─────────────────────────────────────────────────────────────────────
// Fetch + 429 handling
// ─────────────────────────────────────────────────────────────────────
let total429 = 0;
let total200 = 0;

async function fetchJson(url, maxRetries = 5) {
    const bucket = bucketFor(url);
    let lastErr;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        await appLimiter.acquire();
        await bucket.acquire();
        try {
            const res = await fetch(url);
            const limitHeader = res.headers.get('X-Method-Rate-Limit');
            if (limitHeader) {
                if (!bucket.discovered) {
                    console.log(`  [method limits] ${bucket.key} → ${limitHeader}`);
                    bucket.discovered = true;
                }
                bucket.updateFromHeader(limitHeader);
            }
            if (res.status === 429) {
                total429++;
                const retryAfter = parseFloat(res.headers.get('Retry-After') || '5');
                const backoff = Math.min(
                    Math.max(retryAfter, 5) * 1000 * Math.pow(1.5, attempt),
                    60_000,
                );
                appLimiter.pause(backoff);
                if (attempt === maxRetries) throw new Error(`429 after ${maxRetries + 1} attempts`);
                continue;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            total200++;
            return json;
        } catch (e) {
            lastErr = e;
            if (attempt < maxRetries) {
                await sleep(Math.min(500 * 2 ** attempt, 5_000));
            }
        }
    }
    throw lastErr;
}

// ─────────────────────────────────────────────────────────────────────
// Bounded worker pool
// ─────────────────────────────────────────────────────────────────────
async function runPool(tasks, concurrency) {
    let next = 0;
    await Promise.all(Array.from({ length: concurrency }, async () => {
        while (true) {
            const i = next++;
            if (i >= tasks.length) return;
            try { await tasks[i](); }
            catch (e) { console.error(`Task ${i}: ${e.message}`); }
        }
    }));
}

// ─────────────────────────────────────────────────────────────────────
// CSV helpers
// ─────────────────────────────────────────────────────────────────────
function csvEscape(v) {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
}

function formatRank(tier, rank) {
    if (!tier) return '';
    if (['CHALLENGER', 'GRANDMASTER', 'MASTER'].includes(tier)) return tier;
    return `${tier}${rank}`;
}

function extractRows(match, rankLabel) {
    const rows = [];
    const gameDuration       = match.info.gameDuration;        // seconds
    const gameStartTimestamp = match.info.gameStartTimestamp;  // ms since epoch
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

// ─────────────────────────────────────────────────────────────────────
// IO helpers
// ─────────────────────────────────────────────────────────────────────
async function loadAlreadyDone(path) {
    const done = new Set();
    if (!fs.existsSync(path)) return done;
    const rl = readline.createInterface({ input: fs.createReadStream(path) });
    let first = true;
    for await (const line of rl) {
        if (first) { first = false; continue; }        // skip header
        const idx = line.indexOf(',');
        if (idx > 0) done.add(line.slice(0, idx));
    }
    return done;
}

function loadMatchIds(path) {
    const lines = fs.readFileSync(path, 'utf8').split('\n');
    const out = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [id, tier, rank] = line.split(',');
        if (!id) continue;
        out.push({ id, rankLabel: formatRank(tier, rank) });
    }
    return out;
}

function makeWriter(stream) {
    let chain = Promise.resolve();
    return (data) => {
        chain = chain.then(() => new Promise(r => {
            if (stream.write(data)) r();
            else stream.once('drain', r);
        }));
        return chain;
    };
}

// ─────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log(`Config: concurrency=${CONCURRENCY}, safety=${SAFETY}`);
    console.log(`App limits:    ${APP_LIMITS.map(l => `${l.limit}/${l.windowMs/1000}s`).join(', ')}`);
    console.log(`Method default: ${DEFAULT_METHOD_LIMITS.map(l => `${l.limit}/${l.windowMs/1000}s`).join(', ')}`);

    const allMatches = loadMatchIds('match_ids.csv');
    console.log(`Loaded ${allMatches.length} match IDs`);

    const alreadyDone = await loadAlreadyDone('games.csv');
    console.log(`Already in games.csv: ${alreadyDone.size}`);

    const todo = allMatches.filter(m => !alreadyDone.has(m.id));
    console.log(`To process: ${todo.length}`);
    if (todo.length === 0) { console.log('Nothing to do.'); return; }

    const append = alreadyDone.size > 0;
    const stream = fs.createWriteStream('games.csv', { flags: append ? 'a' : 'w' });
    if (!append) stream.write(COLUMNS.join(',') + '\n');
    const write = makeWriter(stream);

    let processed = 0;
    let failed    = 0;
    let stopping  = false;
    const start   = Date.now();

    process.on('SIGINT', () => {
        if (stopping) { console.log('Force exit.'); process.exit(1); }
        stopping = true;
        console.log('\nSIGINT - finishing in-flight requests, will resume next run...');
    });

    await runPool(
        todo.map(m => async () => {
            if (stopping) return;
            const url = `${EUROPE}/lol/match/v5/matches/${m.id}?api_key=${API_KEY}`;
            try {
                const data = await fetchJson(url);
                if (!data?.info?.participants) {
                    console.warn(`No participants in ${m.id}`);
                    failed++;
                    return;
                }
                await write(extractRows(data, m.rankLabel).join('\n') + '\n');
            } catch (e) {
                console.error(`Failed ${m.id}: ${e.message}`);
                failed++;
            }
            processed++;
            if (processed % 100 === 0) {
                const elapsed = (Date.now() - start) / 1000;
                const rate    = processed / elapsed;
                const remain  = (todo.length - processed) / rate;
                console.log(
                    `  ${processed}/${todo.length} · ${rate.toFixed(2)} match/s · ` +
                    `ETA ${(remain / 60).toFixed(1)} min · 429s: ${total429} · failed: ${failed}`,
                );
            }
        }),
        CONCURRENCY,
    );

    await write('');
    await new Promise(r => stream.end(r));

    const mins = ((Date.now() - start) / 1000 / 60).toFixed(1);
    console.log(`Done in ${mins} min. Processed: ${processed}, failed: ${failed}, 429s: ${total429}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
