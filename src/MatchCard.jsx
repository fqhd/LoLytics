function MatchCard({ visible, index, onClick }) {
    return (
        <div
            className={`match-card ${visible ? 'show' : ''}`}
            style={{ transition: `opacity 0.4s ease ${index * 0.2}s, transform 0.4s ease` }}
            onClick={onClick}
        >
            Match {index + 1}
        </div>
    );
}

export default MatchCard;
