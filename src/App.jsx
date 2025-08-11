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
                id: history.match_ids[i]
            });
        }
        setMatchImages(imagePaths);

        setTimeout(() => {
            setShowMatches(true);
        }, 1000);
    };

    const handleMatchClick = async (i) => {
        setSelectedMatch(matchImages[i]);
        let response = await fetch(`http://localhost:3000/match_analysis?id=${matchImages[i].id}`);
        response = await response.json();

        setTimeout(() => {
            setShowMatchDetails(true);
            setLineData(response.probabilities);
        }, 50);
    };

    const handleBack = () => {
        setShowMatchDetails(false);
        setTimeout(() => {
            setSelectedMatch(null);
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

    const data = {
        blue: [
            { name: 'Ahri', icon: '/images/icons/Ahri.jpg', cs: 120, kills: 5, deaths: 1, assists: 3 },
            { name: 'LeeSin', icon: '/images/icons/LeeSin.jpg', cs: 100, kills: 3, deaths: 2, assists: 4 },
            { name: 'MasterYi', icon: '/images/icons/MasterYi.jpg', cs: 100, kills: 3, deaths: 2, assists: 4 },
            { name: 'Riven', icon: '/images/icons/Riven.jpg', cs: 100, kills: 3, deaths: 2, assists: 4 },
            { name: 'VelKoz', icon: '/images/icons/Velkoz.jpg', cs: 100, kills: 3, deaths: 2, assists: 4 },
        ],
        red: [
            { name: 'Zed', icon: '/images/icons/Zed.jpg', cs: 110, kills: 2, deaths: 5, assists: 1 },
            { name: 'Jinx', icon: '/images/icons/Jinx.jpg', cs: 130, kills: 6, deaths: 0, assists: 6 },
            { name: 'JarvanIV', icon: '/images/icons/JarvanIV.jpg', cs: 130, kills: 6, deaths: 0, assists: 6 },
            { name: 'BelVeth', icon: '/images/icons/Belveth.jpg', cs: 130, kills: 6, deaths: 0, assists: 6 },
            { name: 'Annie', icon: '/images/icons/Annie.jpg', cs: 130, kills: 6, deaths: 0, assists: 6 },
        ]
    };

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
                        <div className="timeline">
                            <LineChart data={lineData} />
                        </div>
                        <div className='minimap'></div>
                        <div className='items'>
                            <PurchasePath iconPaths={[
                                '/images/items/1001.jpg',
                                '/images/items/1006.jpg',
                                '/images/items/2003.jpg',
                                '/images/items/1027.jpg',
                            ]} />
                        </div>
                        <Scoreboard data={data} />
                        <Runes
                            primaryTree={{
                                keystone: '/images/Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying.png',
                                subs: ['/images/Styles/Resolve/BonePlating/BonePlating.png', '/images/Styles/Resolve/Demolish/Demolish.png', '/images/Styles/Resolve/Conditioning/Conditioning.png']
                            }}
                            secondaryTree={{
                                subs: ['/images/Styles/Precision/LegendAlacrity/LegendAlacrity.png', '/images/Styles/Precision/LegendBloodline/LegendBloodline.png']
                            }}
                            statPerks={[
                                '/images/stats/statmodsadaptiveforceicon.png',
                                '/images/stats/statmodsadaptiveforceicon.png',
                                '/images/stats/statmodshealthscalingicon.png'
                            ]}
                        />
                    </div>
                    <button className="back-button" onClick={handleBack}>Back</button>
                </div>
            )}
        </div>
    );
}

export default App;
