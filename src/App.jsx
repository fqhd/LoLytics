import { useState, useEffect } from 'react';
import './App.css';
import MatchCard from './MatchCard';
import LineChart from './LineChart';
import Scoreboard from './Scoreboard';
import PurchasePath from './PurchasePath';
import Runes from './Runes';

function App() {
    const [searched, setSearched] = useState(false);
    const [showMatches, setShowMatches] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [showMatchDetails, setShowMatchDetails] = useState(false);
    const [matchImages, setMatchImages] = useState([]);
    const [name, setName] = useState('');
    const [tag, setTag] = useState('');
    const [lineData, setLineData] = useState([]);
    const [runes, setRunes] = useState(null);
    const [items, setItems] = useState([]);
    const [frames, setFrames] = useState(null);
    const [frameIndex, setFrameIndex] = useState(0);

    const handleSearch = async () => {
        setSearched(true);

        let history = await fetch(`http://localhost:3000/match_history?name=${name}&tag=${tag}`);
        history = await history.json();

        let matchDetails = [];
        for (const match_id of history.match_ids.slice(0, 5)) {
            matchDetails.push(fetch(`http://localhost:3000/match_details?id=${match_id}&puuid=${history.puuid}`));
        }
        matchDetails = await Promise.all(matchDetails);

        const imagePaths = [];
        for (let i = 0; i < matchDetails.length; i++) {
            const detail = matchDetails[i];
            const match = await detail.json();
            imagePaths.push({
                left: `/images/splash/${match.player_champion}.jpg`,
                right: `/images/splash/${match.opponent_champion}.jpg`,
                win: match.win,
                id: history.match_ids[i],
                team: match.team,
                puuid: history.puuid,
            });
        }
        setMatchImages(imagePaths);

        setTimeout(() => {
            setShowMatches(true);
        }, 1000);
    };

    const handleMatchClick = async (i) => {
        setSelectedMatch(matchImages[i]);
        let response = await fetch(`http://localhost:3000/match_analysis?id=${matchImages[i].id}&puuid=${matchImages[i].puuid}`);
        response = await response.json();

        setFrames(response.frames);

        setItems(response.items.map(itemId => `/images/items/${itemId}.jpg`));

        const relativeProbabilities = response.probabilities.map((p, _) => {
            if (matchImages[i].team == 200) {
                return 1 - p;
            }
            return p;
        });

        setTimeout(() => {
            setRunes(response.runes);
            setLineData(relativeProbabilities);
            setShowMatchDetails(true);
        }, 50);
    };

    const handleBack = () => {
        setShowMatchDetails(false);
        setTimeout(() => {
            setSelectedMatch(null);
            setFrameIndex(0);
        }, 400);
    };

    useEffect(() => {
        const handleKeyPress = e => {
            if (e.key === 'Escape') {
                if (selectedMatch !== null) {
                    handleBack();
                } else {
                    setSearched(false);
                    setShowMatches(false);
                }
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [selectedMatch]);

    const data = frames && frames[frameIndex] ? {
        blue: [
            { name: frames[frameIndex][0].champion, cs: frames[frameIndex][0].creepscore, kills: frames[frameIndex][0].kills, deaths: frames[frameIndex][0].deaths, assists: frames[frameIndex][0].assists },
            { name: frames[frameIndex][1].champion, cs: frames[frameIndex][1].creepscore, kills: frames[frameIndex][1].kills, deaths: frames[frameIndex][1].deaths, assists: frames[frameIndex][1].assists },
            { name: frames[frameIndex][2].champion, cs: frames[frameIndex][2].creepscore, kills: frames[frameIndex][2].kills, deaths: frames[frameIndex][2].deaths, assists: frames[frameIndex][2].assists },
            { name: frames[frameIndex][3].champion, cs: frames[frameIndex][3].creepscore, kills: frames[frameIndex][3].kills, deaths: frames[frameIndex][3].deaths, assists: frames[frameIndex][3].assists },
            { name: frames[frameIndex][4].champion, cs: frames[frameIndex][4].creepscore, kills: frames[frameIndex][4].kills, deaths: frames[frameIndex][4].deaths, assists: frames[frameIndex][4].assists },
        ],
        red: [
            { name: frames[frameIndex][5].champion, cs: frames[frameIndex][5].creepscore, kills: frames[frameIndex][5].kills, deaths: frames[frameIndex][5].deaths, assists: frames[frameIndex][5].assists },
            { name: frames[frameIndex][6].champion, cs: frames[frameIndex][6].creepscore, kills: frames[frameIndex][6].kills, deaths: frames[frameIndex][6].deaths, assists: frames[frameIndex][6].assists },
            { name: frames[frameIndex][7].champion, cs: frames[frameIndex][7].creepscore, kills: frames[frameIndex][7].kills, deaths: frames[frameIndex][7].deaths, assists: frames[frameIndex][7].assists },
            { name: frames[frameIndex][8].champion, cs: frames[frameIndex][8].creepscore, kills: frames[frameIndex][8].kills, deaths: frames[frameIndex][8].deaths, assists: frames[frameIndex][8].assists },
            { name: frames[frameIndex][9].champion, cs: frames[frameIndex][9].creepscore, kills: frames[frameIndex][9].kills, deaths: frames[frameIndex][9].deaths, assists: frames[frameIndex][9].assists },
        ]
    } : null;

    return (
        <div className="container">
            <div className={`title ${searched ? 'title-shrink' : ''}`}>LoLytics</div>

            <div className={`input-group-wrapper ${searched ? 'fade-out' : ''}`}>
                <div className="input-group">
                    <input className="input-left" placeholder="Name" onChange={(e) => setName(e.target.value)} />
                    <input className="input-right" placeholder="Tag" onChange={(e) => setTag(e.target.value)} />
                </div>
                <button className="search-button" onClick={handleSearch}>
                    <span className="search-button-text">Search</span>
                </button>
            </div>

            <div className={`match-history-container ${showMatches && selectedMatch === null ? 'show' : ''}`}>
                {[...Array(5)].map((_, i) => (
                    <MatchCard
                        key={i}
                        visible={showMatches && selectedMatch === null}
                        index={i}
                        onClick={() => handleMatchClick(i)}
                        leftImage={matchImages[i]?.left}
                        rightImage={matchImages[i]?.right}
                        win={matchImages[i]?.win}
                    />
                ))}
            </div>

            {selectedMatch !== null && (
                <div className={`match-details ${showMatchDetails ? 'show' : ''}`}>
                    <div className="data">
                        <div className="top-row">
                            <div className="timeline">
                                <LineChart data={lineData} frameIndex={frameIndex} setFrameIndex={setFrameIndex} />
                            </div>
                            <div className='minimap'>
                                {frames && frames[frameIndex] && frames[frameIndex].map((champ, i) => {
                                    const mapWidth = 15000;
                                    const mapHeight = 15000;
                                    const xPercent = (champ.x / mapWidth) * 100;
                                    const yPercent = (1 - champ.y / mapHeight) * 100;
                                    const deathTimer = parseInt(champ.deathTimer);

                                    return (
                                        <img
                                            key={i}
                                            src={`/images/icons/${champ.champion}.jpg`}
                                            alt={champ.champion}
                                            className={`minimap-icon ${deathTimer > 0 ? 'dead' : ''} ${i < 5 ? 'blue-icon' : 'red-icon'}`}
                                            style={{
                                                left: `${xPercent}%`,
                                                top: `${yPercent}%`,
                                                transform: 'translate(-50%, -50%)'
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                        <div className="bottom-row">
                            <div className='items'>
                                <PurchasePath iconPaths={items} />
                            </div>
                            {data && <Scoreboard data={data} />}
                            {runes && <Runes data={runes} />}
                        </div>
                    </div>
                    <button className="back-button" onClick={handleBack}><span className="back-button-text">Back</span></button>
                </div>
            )}
        </div>
    );
}

export default App;
