import { Link } from 'react-router-dom';

export default function Navbar() {
    return (
        <nav className="navbar">
            <Link to="/" className="logo">
                LoLytics
            </Link>
            <Link to="/research" className="page">
                Research
            </Link>
            <Link to="/faq" className="page">
                FAQ
            </Link>
        </nav>
    );
}
