import { useState, useEffect } from 'react';
import './App.css';

function App() {
    const [searched, setSearched] = useState(false);

    const handleSearch = () => {
        setSearched(true);
    };

    useEffect(() => {
        const handleKeyPress = e => {
            if (e.key == 'Escape') {
                setSearched(false);
            }
        };

        document.addEventListener('keydown', handleKeyPress);

        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
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
        </div>
    );
}

export default App;
