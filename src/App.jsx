import { useState, useEffect } from 'react';
import './App.css';
import MatchCard from './MatchCard';

function App() {
    const [searched, setSearched] = useState(false);
    const [showMatches, setShowMatches] = useState(false);

    const handleSearch = () => {
        setSearched(true);

        setTimeout(() => {
            setShowMatches(true);
        }, 1000);
    };

    useEffect(() => {
        const handleKeyPress = e => {
            if (e.key === 'Escape') {
                setSearched(false);
                setShowMatches(false);
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, []);

    return (
        <div className="container">
            <div className={`title ${searched ? 'title-shrink' : ''}`}>LoLytics</div>

            <div className={`input-group-wrapper ${searched ? 'fade-out' : ''}`}>
                <div className="input-group">
                    <input className="input-left" placeholder="Name" />
                    <input className="input-right" placeholder="Tag" />
                </div>
                <button className="search-button" onClick={handleSearch}>
                    <span className="search-button-text">Search</span>
                </button>
            </div>

            <div className={`match-history-container ${showMatches ? 'show' : ''}`}>
                {[...Array(5)].map((_, i) => (
                    <MatchCard key={i} visible={showMatches} index={i} />
                ))}
            </div>
        </div>
    );
}

export default App;
