import { useState, useEffect } from 'react';
import MatchCard from '../MatchCard';
import LineChart from '../LineChart';
import Scoreboard from '../Scoreboard';
import PurchasePath from '../PurchasePath';
import Runes from '../Runes';
import '../App.css';

const apiUrl = import.meta.env.VITE_API_URL;

export default function Home() {
    const [active, setActive] = useState('soloq');
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState('');
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

    const handleChange = (name) => setActive(name);

    const handleSearch = async () => {
        setSearched(true);

        try {
            const start = Date.now();

            let history = await fetch(`${apiUrl}/match_history?name=${name}&tag=${tag.replaceAll('#', '')}&region=${region}&queue=${active}`);
            if (history.status != 200) {
                history = await history.json();
                throw new Error(history.error);
            }
            history = await history.json();

            let matchDetails = [];
            for (const match_id of history.match_ids.slice(0, 5)) {
                matchDetails.push(fetch(`${apiUrl}/match_details?id=${match_id}&puuid=${history.puuid}&region=${region}`));
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
                setError('');
                setShowMatches(true);
            }, Math.max(1000 - end + start, 0));
        } catch (e) {
            setSearched(false);
            setError(e.message);
        }
    };

    const handleMatchClick = async (i) => {
        setFrameIndex(0);
        setSelectedMatch(matchImages[i]);

        let response = await fetch(`${apiUrl}/match_analysis?id=${matchImages[i].id}&puuid=${matchImages[i].puuid}&region=${region}`);
        response = await response.json();

        setFrames(response.frames);

        setItems(response.items);

        const relativeProbabilities = response.probabilities.map((p, _) => {
            if (matchImages[i].team == 200) {
                return 1 - p;
            }
            return p;
        });


        for (const k in response.events) {
            if (matchImages[i].team == 200) {
                response.events[k].forEach(event => {
                    event.delta = -event.delta;
                });
            }
        }

        setTimeout(() => {
            setRunes(response.runes);
            setLineData(relativeProbabilities);
            setEvents(response.events);
            setShowMatchDetails(true);
        }, 50);
    };

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') {
                if (showMatchDetails) {
                    setShowMatchDetails(false);
                    setTimeout(() => setSelectedMatch(null), 400);
                } else if (showMatches) {
                    setShowMatches(false);
                    setSearched(false);
                    setSelectedMatch(null);
                }
            }
        };
        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [showMatches, showMatchDetails]);

    return (
        <div className="container">
            <div className={`username ${searched ? 'username-show' : ''}`}>{name.toUpperCase()}#{tag.toUpperCase()}</div>

            <div className={`input-group-wrapper ${searched ? 'fade-out' : ''}`}>
                <div className="title">LoLytics</div>
                <div className={`error-message ${error != '' ? 'error-message-show' : ''}`}>{error}</div>
                <div className="input-group">
                    <input className="input-left" placeholder="Name" onChange={(e) => setName(e.target.value)} />
                    <input className="input-right" placeholder="Tag" onChange={(e) => setTag(e.target.value)} />
                    <select className="input-dropdown" defaultValue='europe' onChange={(e) => setRegion(e.target.value)}>
                        <option value="americas">NA</option>
                        <option value="europe">EUW</option>
                        <option value="europe">ME</option>
                        <option value="europe">EUNE</option>
                        <option value="sea">OCE</option>
                        <option value="asia">KR</option>
                        <option value="asia">JP</option>
                        <option value="americas">BR</option>
                        <option value="americas">LAS</option>
                        <option value="americas">LAN</option>
                        <option value="europe">RU</option>
                        <option value="europe">TR</option>
                        <option value="sea">SEA</option>
                        <option value="sea">TW</option>
                        <option value="sea">VN</option>
                    </select>
                </div>
                <div className="search-options">
                    <label className="modern-radio">
                        <input
                            type="radio"
                            name="queue"
                            value="soloq"
                            checked={active === "soloq"}
                            onChange={() => handleChange("soloq")}
                        />
                        <span className="checkmark"></span>
                        Ranked Solo/Duo
                    </label>

                    <label className="modern-radio">
                        <input
                            type="radio"
                            name="queue"
                            value="draft"
                            checked={active === "draft"}
                            onChange={() => handleChange("draft")}
                        />
                        <span className="checkmark"></span>
                        Normal Draft
                    </label>

                    <label className="modern-radio">
                        <input
                            type="radio"
                            name="queue"
                            value="flex"
                            checked={active === "flex"}
                            onChange={() => handleChange("flex")}
                        />
                        <span className="checkmark"></span>
                        Ranked Flex
                    </label>
                </div>

                <button className="search-button" onClick={handleSearch}>
                    <span className="search-button-text">Search</span>
                </button>
            </div>

            <div className={`match-history-container ${showMatches && selectedMatch === null ? 'show' : ''}`}>
                {[...Array(matchImages.length)].map((_, i) => (
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
                <div className={`match-details ${showMatchDetails ? 'show' : ''}`} style={{
                    border: `3px solid ${selectedMatch.win ? '#42cdff' : '#fc4747'}`
                }}>
                    <div className="data">
                        <div className="top-row">
                            <div className="timeline">
                                <LineChart data={lineData} frameIndex={frameIndex} setFrameIndex={setFrameIndex} />
                            </div>
                            <div className='minimap'>
                                <img src='images/nexus.png' className="blue-building building" style={{
                                    left: '6%',
                                    bottom: '6%',
                                    width: '9.6%',
                                }} />

                                <img src='images/nexus.png' className="red-building building" style={{
                                    top: '6%',
                                    right: '6%',
                                    width: '9.6%',
                                }} />

                                {frames && frames[frameIndex].teams[0].inhibs[1] == 0 && <img src='images/inhibitor.png' className="blue-building building" style={{
                                    bottom: '15%',
                                    left: '15%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[0].inhibs[0] == 0 && <img src='images/inhibitor.png' className="blue-building building" style={{
                                    bottom: '18%',
                                    left: '4.5%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[0].inhibs[2] == 0 && <img src='images/inhibitor.png' className="blue-building building" style={{
                                    bottom: '4.5%',
                                    left: '18%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[1].inhibs[1] == 0 && <img src='images/inhibitor.png' className="red-building building" style={{
                                    top: '15%',
                                    right: '15%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[1].inhibs[0] == 0 && <img src='images/inhibitor.png' className="red-building building" style={{
                                    top: '18%',
                                    right: '4.5%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[1].inhibs[2] == 0 && <img src='images/inhibitor.png' className="red-building building" style={{
                                    top: '4.5%',
                                    right: '18%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[0].towers[0] == 1 && <img src='images/tower.png' className="blue-building building" style={{
                                    bottom: '66%',
                                    left: '3%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[0].towers[1] == 1 && <img src='images/tower.png' className="blue-building building" style={{
                                    bottom: '39%',
                                    left: '6%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[0].towers[2] == 1 && <img src='images/tower.png' className="blue-building building" style={{
                                    bottom: '24%',
                                    left: '4.5%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[0].towers[3] == 1 && <img src='images/tower.png' className="blue-building building" style={{
                                    bottom: '37.5%',
                                    left: '36%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[0].towers[4] == 1 && <img src='images/tower.png' className="blue-building building" style={{
                                    bottom: '28.5%',
                                    left: '30%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[0].towers[5] == 1 && <img src='images/tower.png' className="blue-building building" style={{
                                    bottom: '19.5%',
                                    left: '19.5%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[0].towers[6] == 1 && <img src='images/tower.png' className="blue-building building" style={{
                                    bottom: '3%',
                                    left: '67.5%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[0].towers[7] == 1 && <img src='images/tower.png' className="blue-building building" style={{
                                    bottom: '6%',
                                    left: '42%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[0].towers[8] == 1 && <img src='images/tower.png' className="blue-building building" style={{
                                    bottom: '4.5%',
                                    left: '24%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[1].towers[0] == 1 && <img src='images/tower.png' className="red-building building" style={{
                                    top: '0',
                                    right: '67.5%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[1].towers[1] == 1 && <img src='images/tower.png' className="red-building building" style={{
                                    top: '4.5%',
                                    right: '42%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[1].towers[2] == 1 && <img src='images/tower.png' className="red-building building" style={{
                                    top: '3%',
                                    right: '24%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[1].towers[3] == 1 && <img src='images/tower.png' className="red-building building" style={{
                                    top: '37.5%',
                                    right: '36%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[1].towers[4] == 1 && <img src='images/tower.png' className="red-building building" style={{
                                    top: '25.5%',
                                    right: '30%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[1].towers[5] == 1 && <img src='images/tower.png' className="red-building building" style={{
                                    top: '19.5%',
                                    right: '19.5%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[1].towers[6] == 1 && <img src='images/tower.png' className="red-building building" style={{
                                    top: '66%',
                                    right: '3%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[1].towers[7] == 1 && <img src='images/tower.png' className="red-building building" style={{
                                    top: '39%',
                                    right: '6%',
                                    width: '7.2%',
                                }} />}

                                {frames && frames[frameIndex].teams[1].towers[8] == 1 && <img src='images/tower.png' className="red-building building" style={{
                                    top: '24%',
                                    right: '4.5%',
                                    width: '7.2%',
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
                                <PurchasePath items={items} frameIndex={frameIndex} />
                            </div>
                            {frames && frames[frameIndex] && <Scoreboard data={frames[frameIndex]} />}
                            {runes && <Runes data={runes} events={events[frameIndex]} />}
                        </div>
                    </div>
                </div>
            )}
            <footer className="copyright">© 2025 LoLytics — Open Source (MIT License) · <a
                href="https://github.com/fqhd/LoLytics"
                target="_blank"
                className="github"
            >
                View on GitHub
            </a></footer>
        </div>
    );
}
