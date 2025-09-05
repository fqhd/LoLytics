import { useState, useEffect } from 'react';
import './App.css';
import MatchCard from './MatchCard';
import LineChart from './LineChart';
import Scoreboard from './Scoreboard';
import PurchasePath from './PurchasePath';
import Runes from './Runes';

function App() {
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState(false);
    const [showMatches, setShowMatches] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [showMatchDetails, setShowMatchDetails] = useState(false);
    const [matchImages, setMatchImages] = useState([]);
    const [name, setName] = useState('');
    const [tag, setTag] = useState('');
    const [lineData, setLineData] = useState([]);
    const [events, setEvents] = useState({});
    const [runes, setRunes] = useState(null);
    const [items, setItems] = useState([]);
    const [frames, setFrames] = useState(null);
    const [frameIndex, setFrameIndex] = useState(0);
    const [region, setRegion] = useState('europe');

    const handleSearch = async () => {
        setSearched(true);

        try {
            const start = Date.now();

            let history = await fetch(`http://localhost:3000/match_history?name=${name}&tag=${tag}&region=${region}`);
            history = await history.json();

            let matchDetails = [];
            for (const match_id of history.match_ids.slice(0, 5)) {
                matchDetails.push(fetch(`http://localhost:3000/match_details?id=${match_id}&puuid=${history.puuid}&region=${region}`));
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

            const end = Date.now();

            setTimeout(() => {
                setError(false);
                setShowMatches(true);
            }, Math.max(1000 - end + start, 0));
        } catch (e) {
            setSearched(false);
            setError(true);
        }
    };

    const handleMatchClick = async (i) => {
        setSelectedMatch(matchImages[i]);
        let response = await fetch(`http://localhost:3000/match_analysis?id=${matchImages[i].id}&puuid=${matchImages[i].puuid}&region=${region}`);
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
            setEvents(response.events);
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
                if (selectedMatch === null) {
                    setSearched(false);
                    setShowMatches(false);
                }
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [selectedMatch]);

    return (
        <div className="container">
            <div className={`title ${searched ? 'title-shrink' : ''}`}>LoLytics</div>
            <div className={`username ${searched ? 'username-show' : ''}`}>{name.toUpperCase()}#{tag.toUpperCase()}</div>

            <div className={`input-group-wrapper ${searched ? 'fade-out' : ''}`}>
                <div className={`error-message ${error ? 'error-message-show' : ''}`}>Summoner Not Found</div>
                <div className="input-group">
                    <input className="input-left" placeholder="Name" onChange={(e) => setName(e.target.value)} />
                    <input className="input-right" placeholder="Tag" onChange={(e) => setTag(e.target.value)} />
                    <select className="input-dropdown" defaultValue='europe' onChange={(e) => setRegion(e.target.value)}>
                        <option value="americas">America</option>
                        <option value="asia">Asia</option>
                        <option value="europe">Europe</option>
                    </select>
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
                                <LineChart data={lineData} frameIndex={frameIndex} setFrameIndex={setFrameIndex} events={events} />
                            </div>
                            <div className='minimap'>
                                <img src='images/nexus.png' className="blue-building building" style={{
                                    left: '20px',
                                    bottom: '20px',
                                    width: '32px',
                                }} />

                                <img src='images/nexus.png' className="red-building building" style={{
                                    top: '20px',
                                    right: '20px',
                                    width: '32px',
                                }} />

                                {frames && frames[frameIndex].teams[0].inhibs[1] == 0 && <img src='images/inhibitor.png' className="blue-building building" style={{
                                    bottom: '50px',
                                    left: '50px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[0].inhibs[0] == 0 && <img src='images/inhibitor.png' className="blue-building building" style={{
                                    bottom: '60px',
                                    left: '15px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[0].inhibs[2] == 0 && <img src='images/inhibitor.png' className="blue-building building" style={{
                                    bottom: '15px',
                                    left: '60px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[1].inhibs[1] == 0 && <img src='images/inhibitor.png' className="red-building building" style={{
                                    top: '50px',
                                    right: '50px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[1].inhibs[0] == 0 && <img src='images/inhibitor.png' className="red-building building" style={{
                                    top: '60px',
                                    right: '15px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[1].inhibs[2] == 0 && <img src='images/inhibitor.png' className="red-building building" style={{
                                    top: '15px',
                                    right: '60px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[0].towers[0] == 1 && <img src='images/tower.png' className="blue-building building" style={{
                                    bottom: '220px',
                                    left: '10px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[0].towers[1] == 1 && <img src='images/tower.png' className="blue-building building" style={{
                                    bottom: '130px',
                                    left: '20px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[0].towers[2] == 1 && <img src='images/tower.png' className="blue-building building" style={{
                                    bottom: '80px',
                                    left: '15px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[0].towers[3] == 1 && <img src='images/tower.png' className="blue-building building" style={{
                                    bottom: '125px',
                                    left: '120px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[0].towers[4] == 1 && <img src='images/tower.png' className="blue-building building" style={{
                                    bottom: '95px',
                                    left: '100px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[0].towers[5] == 1 && <img src='images/tower.png' className="blue-building building" style={{
                                    bottom: '65px',
                                    left: '65px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[0].towers[6] == 1 && <img src='images/tower.png' className="blue-building building" style={{
                                    bottom: '10px',
                                    left: '225px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[0].towers[7] == 1 && <img src='images/tower.png' className="blue-building building" style={{
                                    bottom: '20px',
                                    left: '140px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[0].towers[8] == 1 && <img src='images/tower.png' className="blue-building building" style={{
                                    bottom: '15px',
                                    left: '80px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[1].towers[0] == 1 && <img src='images/tower.png' className="red-building building" style={{
                                    top: '0px',
                                    right: '225px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[1].towers[1] == 1 && <img src='images/tower.png' className="red-building building" style={{
                                    top: '15px',
                                    right: '140px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[1].towers[2] == 1 && <img src='images/tower.png' className="red-building building" style={{
                                    top: '10px',
                                    right: '80px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[1].towers[3] == 1 && <img src='images/tower.png' className="red-building building" style={{
                                    top: '125px',
                                    right: '120px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[1].towers[4] == 1 && <img src='images/tower.png' className="red-building building" style={{
                                    top: '85px',
                                    right: '100px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[1].towers[5] == 1 && <img src='images/tower.png' className="red-building building" style={{
                                    top: '65px',
                                    right: '65px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[1].towers[6] == 1 && <img src='images/tower.png' className="red-building building" style={{
                                    top: '220px',
                                    right: '10px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[1].towers[7] == 1 && <img src='images/tower.png' className="red-building building" style={{
                                    top: '130px',
                                    right: '20px',
                                    width: '24px',
                                }} />}

                                {frames && frames[frameIndex].teams[1].towers[8] == 1 && <img src='images/tower.png' className="red-building building" style={{
                                    top: '80px',
                                    right: '15px',
                                    width: '24px',
                                }} />}



                                {frames && frames[frameIndex].teams[0].players.map((champ, i) => {
                                    const mapWidth = 15000;
                                    const mapHeight = 15000;
                                    const xPercent = (champ.x / mapWidth) * 100;
                                    const yPercent = (1 - champ.y / mapHeight) * 100;
                                    const deathTimer = Math.ceil(champ.deathTimer);

                                    return (
                                        <img
                                            key={i}
                                            src={`/images/icons/${champ.champion}.jpg`}
                                            alt={champ.champion}
                                            className={`minimap-icon ${deathTimer > 0 ? 'dead' : ''} blue-icon`}
                                            style={{
                                                left: `${xPercent}%`,
                                                top: `${yPercent}%`,
                                                transform: 'translate(-50%, -50%)'
                                            }}
                                        />
                                    );
                                })}
                                {frames && frames[frameIndex] && frames[frameIndex].teams[1].players.map((champ, i) => {
                                    const mapWidth = 15000;
                                    const mapHeight = 15000;
                                    const xPercent = (champ.x / mapWidth) * 100;
                                    const yPercent = (1 - champ.y / mapHeight) * 100;
                                    const deathTimer = Math.ceil(champ.deathTimer);

                                    return (
                                        <img
                                            key={i}
                                            src={`/images/icons/${champ.champion}.jpg`}
                                            alt={champ.champion}
                                            className={`minimap-icon ${deathTimer > 0 ? 'dead' : ''} red-icon`}
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
                            {frames && frames[frameIndex] && <Scoreboard data={frames[frameIndex]} />}
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
