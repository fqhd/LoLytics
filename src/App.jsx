import { useState, useEffect } from 'react';
import './App.css';
import MatchCard from './MatchCard';

function App() {
    const [searched, setSearched] = useState(false);
    const [showMatches, setShowMatches] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [showMatchDetails, setShowMatchDetails] = useState(false);
    const [matchImages, setMatchImages] = useState([]);
    const [name, setName] = useState('');
    const [tag, setTag] = useState('');

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
        for (const detail of matchDetails) {
            const match = await detail.json();
            imagePaths.push({
                left: `/images/${match.player_champion}.jpg`,
                right: `/images/${match.opponent_champion}.jpg`
            });
        }
        setMatchImages(imagePaths);

        setTimeout(() => {
            setShowMatches(true);
        }, 1000);
    };

    const handleMatchClick = (i) => {
        setSelectedMatch(i);
        setTimeout(() => {
            setShowMatchDetails(true);
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
                    />
                ))}
            </div>

            {selectedMatch !== null && (
                <div className={`match-details ${showMatchDetails ? 'show' : ''}`}>
                    <h2>Match {selectedMatch + 1} Details</h2>
                    <button className="back-button" onClick={handleBack}>Back</button>
                </div>
            )}
        </div>
    );
}

export default App;
