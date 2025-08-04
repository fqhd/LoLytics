export default function MatchCard({ visible, index }) {
    return (
        <div
            className={`match-card ${visible ? 'show' : ''}`}
            style={{ transition: `opacity 0.4s ease ${index * 0.2}s, transform 0.2s ease` }}
        >
            Match {index + 1}
        </div>
    );
}