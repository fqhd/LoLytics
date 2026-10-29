import fs from 'fs';
import { parse_env_file, sleep } from './utils.js';

const env = parse_env_file('.env');

// ─────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────
const EUW_BASE        = 'https://euw1.api.riotgames.com';
const EUROPE_BASE     = 'https://europe.api.riotgames.com';
const TARGET_ACCOUNTS = 80_000;
const TOP_N_ACCOUNTS  = 20_000;
const MATCHES_PER_ACC = 100;
const CONCURRENCY     = 20;

// App limits from X-App-Rate-Limit: 500:10, 30000:600. Use 70 %.
const APP_SHORT_LIMIT     = 350;
const APP_SHORT_WINDOW_MS = 10_000;
const APP_LONG_LIMIT      = 21_000;
const APP_LONG_WINDOW_MS  = 600_000;

// Method limits: if unknown, start conservative. 10/10 s is safe for any
// Riot method. The very first response for each method replaces this with
// the real numbers from X-Method-Rate-Limit.
const METHOD_DEFAULT_LIMIT     = 10;
const METHOD_DEFAULT_WINDOW_MS = 10_000;
const METHOD_SAFETY_FACTOR     = 0.75;

// ─────────────────────────────────────────────────────────────────────
// Method-key normalisation
//
// Riot's method bucket is per URL *pattern*, not per concrete URL.
//   /lol/league/v4/entries/RANKED_SOLO_5x5/DIAMOND/I
//   /lol/league/v4/entries/RANKED_SOLO_5x5/IRON/IV
//        → both map to  .../entries/{params}
//   /lol/match/v5/matches/by-puuid/<puuid>/ids
//        → .../by-puuid/{puuid}/ids
// ─────────────────────────────────────────────────────────────────────
function methodKey(url) {
    const u = new URL(url);
    let p = u.pathname;
    p = p.replace(/\/by-puuid\/[^/]+/,      '/by-puuid/{puuid}');
    p = p.replace(/\/entries\/.*$/,         '/entries/{params}');
    p = p.replace(/\/matches\/[A-Z0-9_]+$/, '/matches/{matchId}');
    return `${u.host}${p}`;
}

// ─────────────────────────────────────────────────────────────────────
// App-level limiter (unchanged idea)
// ─────────────────────────────────────────────────────────────────────
class AppLimiter {
    constructor() {
        this.shortTs = [];
        this.longTs  = [];
        this.pauseUntil = 0;
    }
    async acquire() {
        while (true) {
            const now = Date.now();
            if (now < this.pauseUntil) {
                await sleep(Math.min(this.pauseUntil - now + 25, 2_000));
                continue;
            }
            const sCut = now - APP_SHORT_WINDOW_MS;
            const lCut = now - APP_LONG_WINDOW_MS;
            while (this.shortTs.length && this.shortTs[0] < sCut) this.shortTs.shift();
            while (this.longTs.length  && this.longTs[0]  < lCut)  this.longTs.shift();
            if (this.shortTs.length < APP_SHORT_LIMIT && this.longTs.length < APP_LONG_LIMIT) {
                this.shortTs.push(now);
                this.longTs.push(now);
                return;
            }
            const wait = this.shortTs.length >= APP_SHORT_LIMIT
                ? this.shortTs[0] + APP_SHORT_WINDOW_MS - now + 10
                : this.longTs[0]  + APP_LONG_WINDOW_MS  - now + 10;
            await sleep(Math.max(wait, 20));
        }
    }
    pause(ms) { this.pauseUntil = Math.max(this.pauseUntil, Date.now() + ms); }
}

// ─────────────────────────────────────────────────────────────────────
// Per-method limiter – one bucket per URL pattern, multi-window
// ─────────────────────────────────────────────────────────────────────
class MethodBucket {
    constructor() {
        this.windows = [
            { limit: METHOD_DEFAULT_LIMIT, windowMs: METHOD_DEFAULT_WINDOW_MS, ts: [] },
        ];
        this.discovered = false;
    }

    /** Replace internal limits with the real ones reported by Riot. */
    updateFromHeader(value) {
        if (!value || this.discovered) return;
        const newWins = [];
        for (const part of value.split(',')) {
            const [c, w] = part.trim().split(':').map(Number);
            if (!c || !w) continue;
            newWins.push({
                limit:    Math.max(1, Math.floor(c * METHOD_SAFETY_FACTOR)),
                windowMs: w * 1000,
                ts:       [],                       // reset counters; we under-count, which is safe
            });
        }
        if (newWins.length === 0) return;
        this.windows = newWins;
        this.discovered = true;
    }

    async acquire() {
        while (true) {
            const now = Date.now();
            let maxWait = 0, admitted = true;
            for (const w of this.windows) {
                const cut = now - w.windowMs;
                while (w.ts.length && w.ts[0] < cut) w.ts.shift();
                if (w.ts.length >= w.limit) {
                    admitted = false;
                    maxWait = Math.max(maxWait, w.ts[0] + w.windowMs - now + 15);
                }
            }
            if (admitted) {
                for (const w of this.windows) w.ts.push(now);
                return;
            }
            await sleep(Math.max(maxWait, 25));
        }
    }
}

class MethodRegistry {
    constructor() { this.buckets = new Map(); }
    get(url) {
        const k = methodKey(url);
        let b = this.buckets.get(k);
        if (!b) { b = new MethodBucket(); this.buckets.set(k, b); }
        return b;
    }
    report() {
        for (const [k, b] of this.buckets) {
            const limits = b.windows.map(w =>
                `${w.limit}/${(w.windowMs / 1000).toFixed(0)}s`).join(' + ');
            console.log(`  method ${k}  →  ${limits}${b.discovered ? '' : ' (default, unconfirmed)'}`);
        }
    }
}

const appLimiter    = new AppLimiter();
const methodLimiter = new MethodRegistry();

// ─────────────────────────────────────────────────────────────────────
// Fetch with both limiters + header learning
// ─────────────────────────────────────────────────────────────────────
let total429 = 0;
let total200 = 0;

async function fetchJson(url, maxRetries = 5) {
    const bucket = methodLimiter.get(url);
    let lastErr;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        await appLimiter.acquire();
        await bucket.acquire();

        try {
            const res = await fetch(url);

            // Learn limits from EVERY response (200 or 429) the first time.
            if (!bucket.discovered) {
                bucket.updateFromHeader(res.headers.get('X-Method-Rate-Limit'));
            }

            if (res.status === 429) {
                total429++;
                const retryAfter = parseFloat(res.headers.get('Retry-After') || '10');
                const backoffMs = Math.min(
                    Math.max(retryAfter, 5) * 1000 * Math.pow(1.5, attempt),
                    60_000,
                );
                appLimiter.pause(backoffMs);
                if (attempt === maxRetries) {
                    throw new Error(`429 exhausted after ${maxRetries} retries`);
                }
                continue;
            }

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            total200++;
            return await res.json();
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
            catch (e) { console.error(`Task ${i} failed: ${e.message}`); }
        }
    }));
}

// ─────────────────────────────────────────────────────────────────────
// Step 1 – ~80k accounts
// ─────────────────────────────────────────────────────────────────────
async function fetchApex(tier) {
    const url = `${EUW_BASE}/lol/league/v4/${tier.toLowerCase()}leagues/by-queue/RANKED_SOLO_5x5?api_key=${env.RIOT_KEY}`;
    const data = await fetchJson(url);
    if (!data || !Array.isArray(data.entries)) return [];
    return data.entries.map(e => ({
        puuid: e.puuid, tier: data.tier || tier, rank: e.rank || 'I',
        games: (e.wins || 0) + (e.losses || 0),
    }));
}

async function fetchDivision(tier, rank, maxPages) {
    const out = [];
    for (let page = 1; page <= maxPages; page++) {
        const url = `${EUW_BASE}/lol/league/v4/entries/RANKED_SOLO_5x5/${tier}/${rank}?page=${page}&api_key=${env.RIOT_KEY}`;
        const data = await fetchJson(url);
        if (!Array.isArray(data) || data.length === 0) break;
        for (const e of data) {
            out.push({
                puuid: e.puuid, tier: e.tier || tier, rank: e.rank || rank,
                games: (e.wins || 0) + (e.losses || 0),
            });
        }
        if (data.length < 200) break;
    }
    return out;
}

console.log('Step 1 – fetching apex tiers…');
const apexResults = await Promise.allSettled([
    fetchApex('CHALLENGER'), fetchApex('GRANDMASTER'), fetchApex('MASTER'),
]);
const apexAccounts = [];
for (const r of apexResults) {
    if (r.status === 'fulfilled') apexAccounts.push(...r.value);
    else console.warn('Apex tier failed:', r.reason.message);
}
console.log(`  apex accounts: ${apexAccounts.length}`);

const divisions = [];
for (const tier of ['EMERALD', 'DIAMOND'])
    for (const rank of ['I', 'II', 'III', 'IV'])
        divisions.push({ tier, rank });

const remaining        = Math.max(0, TARGET_ACCOUNTS - apexAccounts.length);
const ENTRIES_PER_PAGE = 200;
const pagesPerDivision = Math.min(30,
    Math.max(1, Math.ceil(remaining / divisions.length / ENTRIES_PER_PAGE)));
console.log(`  divisions: ${pagesPerDivision} page(s) × ${divisions.length} = ${pagesPerDivision * divisions.length} requests`);

const divisionAccounts = [];
const step1Start = Date.now();
await runPool(
    divisions.map(d => async () => {
        const entries = await fetchDivision(d.tier, d.rank, pagesPerDivision);
        for (const e of entries) divisionAccounts.push(e);
    }),
    CONCURRENCY,
);
const step1Sec = ((Date.now() - step1Start) / 1000).toFixed(1);
console.log(`  division accounts: ${divisionAccounts.length} (${step1Sec}s)`);
console.log('  Discovered per-method limits after step 1:');
methodLimiter.report();

const seenPuuid = new Set();
const allAccounts = [];
for (const a of [...apexAccounts, ...divisionAccounts]) {
    if (seenPuuid.has(a.puuid)) continue;
    seenPuuid.add(a.puuid);
    allAccounts.push(a);
}
console.log(`Step 1 done: ${allAccounts.length} unique accounts.`);

// ─────────────────────────────────────────────────────────────────────
// Step 2 – top N by games
// ─────────────────────────────────────────────────────────────────────
allAccounts.sort((a, b) => b.games - a.games);
const selected  = allAccounts.slice(0, TOP_N_ACCOUNTS);
const minGames  = selected.length ? selected[selected.length - 1].games : 0;
console.log(`Step 2 – kept top ${selected.length} accounts (min games = ${minGames}).`);

// ─────────────────────────────────────────────────────────────────────
// Step 3 – match histories
// ─────────────────────────────────────────────────────────────────────
console.log(`Step 3 – fetching ${selected.length} match histories…`);
const seenMatch     = new Set();
const uniqueMatches = [];
let processed       = 0;
const step3Start    = Date.now();

await runPool(
    selected.map(acc => async () => {
        const url = `${EUROPE_BASE}/lol/match/v5/matches/by-puuid/${acc.puuid}/ids`
                  + `?queue=420&start=0&count=${MATCHES_PER_ACC}&api_key=${env.RIOT_KEY}`;
        try {
            const ids = await fetchJson(url);
            if (Array.isArray(ids)) {
                for (const id of ids) {
                    if (seenMatch.has(id)) continue;
                    seenMatch.add(id);
                    uniqueMatches.push({ match_id: id, tier: acc.tier, rank: acc.rank });
                }
            }
        } catch (e) {
            console.error(`  match history failed for ${acc.puuid}: ${e.message}`);
        }
        processed++;
        if (processed % 250 === 0) {
            const elapsed = (Date.now() - step3Start) / 1000;
            const rate    = processed / elapsed;
            const remain  = (selected.length - processed) / rate;
            console.log(
                `  ${processed}/${selected.length} · ` +
                `${uniqueMatches.length} unique · ` +
                `${rate.toFixed(1)} acc/s · ` +
                `ETA ${(remain / 60).toFixed(1)} min · ` +
                `429s: ${total429} · OKs: ${total200}`,
            );
        }
    }),
    CONCURRENCY,
);
console.log(`Step 3 done: ${uniqueMatches.length} unique match IDs (429s: ${total429}).`);
console.log('Final per-method limits:');
methodLimiter.report();

// ─────────────────────────────────────────────────────────────────────
// Step 4 – CSV
// ─────────────────────────────────────────────────────────────────────
let csv = 'match_id,tier,rank\n';
for (const m of uniqueMatches) csv += `${m.match_id},${m.tier},${m.rank}\n`;
fs.writeFileSync('match_ids.csv', csv, 'utf8');
console.log(`Wrote ${uniqueMatches.length} rows to match_ids.csv.`);
