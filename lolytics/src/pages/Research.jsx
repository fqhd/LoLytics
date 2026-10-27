import { useEffect, useState, useMemo, useRef } from 'react';
import './Research.css';

const PERCENT_COLS = new Set([
    'WPA', 'WPE', 'WR', 'SE(p)', 'SD(wr)', 'pickrate', 'ECE',
]);

const HIDDEN_COLS = new Set(['itemId', 'type']);

const TYPE_OPTIONS = [
    'Legendary',
    'Epic',
    'Boots',
    'Starter',
    'Basic',
    'Consumables',
    'Trinket',
];

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const allHeaders = lines[0].split(',');
    const headers = allHeaders.filter(h => !HIDDEN_COLS.has(h));
    const rows = lines.slice(1).map(line => {
        const values = [];
        let cur = '';
        let inQuotes = false;
        for (const ch of line) {
            if (ch === '"') { inQuotes = !inQuotes; continue; }
            if (ch === ',' && !inQuotes) { values.push(cur); cur = ''; continue; }
            cur += ch;
        }
        values.push(cur);
        const row = {};
        allHeaders.forEach((h, i) => { row[h] = values[i] ?? ''; });
        return row;
    });
    return { headers, rows };
}

function fmtPct(v) {
    const n = Number(v);
    return Number.isNaN(n) ? v : `${(n * 100).toFixed(2)}%`;
}

function fmtCI(v) {
    if (!v || !v.includes('|')) return v;
    const [lo, hi] = v.split('|');
    return `[${fmtPct(lo)}, ${fmtPct(hi)}]`;
}

function fmtValue(header, value) {
    if (header === '95% CI') return fmtCI(value);
    if (PERCENT_COLS.has(header)) return fmtPct(value);
    return value;
}

function renderHeader(h) {
    if (h === 'SE(p)') {
        return (
            <>
                SE<sub>p̄</sub>
            </>
        );
    }
    if (h === 'SD(wr)') {
        return (
            <>
                SE<sub>wr</sub>
            </>
        );
    }
    return h;
}

function getSortValue(header, row) {
    if (header === 'itemName') return row[header];
    if (header === '95% CI') {
        const [lo, hi] = (row[header] || '0|0').split('|');
        return (Number(lo) + Number(hi)) / 2;
    }
    return Number(row[header]);
}

function wpaColor(wpa) {
    const clamped = Math.max(-0.01, Math.min(0.01, wpa));
    const t = (clamped + 0.01) / 0.02;

    const red   = [248, 113, 113];
    const white = [220, 220, 220];
    const green = [74, 222, 128];

    let color;
    if (t < 0.5) {
        const u = t / 0.5;
        color = [
            Math.round(red[0] + (white[0] - red[0]) * u),
            Math.round(red[1] + (white[1] - red[1]) * u),
            Math.round(red[2] + (white[2] - red[2]) * u),
        ];
    } else {
        const u = (t - 0.5) / 0.5;
        color = [
            Math.round(white[0] + (green[0] - white[0]) * u),
            Math.round(white[1] + (green[1] - white[1]) * u),
            Math.round(white[2] + (green[2] - white[2]) * u),
        ];
    }
    return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function Dropdown({ options, value, onChange, label }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        }
        function handleKey(e) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [open]);

    function select(opt) {
        onChange(opt);
        setOpen(false);
    }

    return (
        <div className="dropdown" ref={ref}>
            <button
                type="button"
                className="dropdown-trigger"
                onClick={() => setOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={label}
            >
                <span>{value}</span>
                <svg
                    className={`dropdown-chevron${open ? ' open' : ''}`}
                    width="12" height="8" viewBox="0 0 12 8"
                    fill="none" xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M1 1.5L6 6.5L11 1.5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>
            {open && (
                <div className="dropdown-menu" role="listbox">
                    {options.map(opt => (
                        <button
                            key={opt}
                            type="button"
                            role="option"
                            aria-selected={opt === value}
                            className={`dropdown-item${opt === value ? ' active' : ''}`}
                            onClick={() => select(opt)}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Research() {
    const [headers, setHeaders] = useState([]);
    const [rows, setRows] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortColumn, setSortColumn] = useState('WPA');
    const [sortDir, setSortDir] = useState('desc');
    const [itemType, setItemType] = useState(TYPE_OPTIONS[0]);

    useEffect(() => {
        fetch('/item_stats.csv')
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.text();
            })
            .then(text => {
                const parsed = parseCSV(text);
                setHeaders(parsed.headers);
                setRows(parsed.rows);
                setLoading(false);
            })
            .catch(e => {
                setError(e.message);
                setLoading(false);
            });
    }, []);

    const filteredRows = useMemo(
        () => rows.filter(r => r.type === itemType),
        [rows, itemType]
    );

    const sortedRows = useMemo(() => {
        if (!sortColumn) return filteredRows;
        const sorted = [...filteredRows].sort((a, b) => {
            const va = getSortValue(sortColumn, a);
            const vb = getSortValue(sortColumn, b);
            if (typeof va === 'string' && typeof vb === 'string') {
                return va.localeCompare(vb);
            }
            return va - vb;
        });
        if (sortDir === 'desc') sorted.reverse();
        return sorted;
    }, [filteredRows, sortColumn, sortDir]);

    function handleSortClick(header) {
        if (header === sortColumn) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(header);
            setSortDir(header === 'itemName' ? 'asc' : 'desc');
        }
    }

    if (loading) {
        return (
            <div className="research-page">
                <h1>Research</h1>
                <p>Loading item statistics…</p>
            </div>
        );
    }
    if (error) {
        return (
            <div className="research-page">
                <h1>Research</h1>
                <p>Failed to load item_stats.csv: {error}</p>
            </div>
        );
    }

    return (
        <div className="research-page">
            <h1>Research</h1>
            <p>Item statistics derived from the LoLytics dataset.</p>
            <div className="type-filter">
                <label>Item type:</label>
                <Dropdown
                    options={TYPE_OPTIONS}
                    value={itemType}
                    onChange={setItemType}
                    label="Select item type"
                />
            </div>
            <div className="research-table-wrapper">
                <table className="research-table">
                    <thead>
                        <tr>
                            {headers.map(h => (
                                <th
                                    key={h}
                                    className={sortColumn === h ? 'sorted' : 'sortable'}
                                    onClick={() => handleSortClick(h)}
                                >
                                    {renderHeader(h)}
                                    {sortColumn === h && (
                                        <span className="sort-indicator">
                                            {sortDir === 'asc' ? '▲' : '▼'}
                                        </span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRows.length === 0 ? (
                            <tr>
                                <td colSpan={headers.length} className="no-results">
                                    No items of type "{itemType}" in the dataset.
                                </td>
                            </tr>
                        ) : (
                            sortedRows.map((row, i) => (
                                <tr key={i}>
                                    {headers.map(h => {
                                        if (h === 'itemName') {
                                            return (
                                                <td key={h}>
                                                    <div className="item-cell">
                                                        <img
                                                            src={`/images/items/${row.itemId}.jpg`}
                                                            alt={row.itemName}
                                                            onError={e => {
                                                                e.currentTarget.style.visibility = 'hidden';
                                                            }}
                                                        />
                                                        <span>{row.itemName}</span>
                                                    </div>
                                                </td>
                                            );
                                        }
                                        if (h === 'WPA') {
                                            return (
                                                <td
                                                    key={h}
                                                    style={{ color: wpaColor(Number(row.WPA)) }}
                                                >
                                                    {fmtValue(h, row[h])}
                                                </td>
                                            );
                                        }
                                        return (
                                            <td key={h}>{fmtValue(h, row[h])}</td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
