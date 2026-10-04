import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Research from './pages/Research';
import FAQ from './pages/FAQ';
import './App.css';

function App() {
    return (
        <Router>
            <Navbar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/research" element={<Research />} />
                <Route path="/faq" element={<FAQ />} />
            </Routes>
            <footer className="copyright">
                © 2025 LoLytics — Open Source (MIT License) ·{' '}
                <a
                    href="https://github.com/fqhd/LoLytics"
                    target="_blank"
                    className="github"
                >
                    View on GitHub
                </a>
            </footer>
        </Router>
    );
}

export default App;
