import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Research from './pages/Research';
import FAQ from './pages/FAQ';
import Draft from './pages/Draft';
import './App.css';

function Layout() {
    const { pathname } = useLocation();
    const footerFixed = pathname !== '/research';

    return (
        <div className="app-wrapper">
            <Navbar />
            <main className="app-main">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/draft" element={<Draft />} />
                    <Route path="/research" element={<Research />} />
                    <Route path="/faq" element={<FAQ />} />
                </Routes>
            </main>
            <footer className={`copyright ${footerFixed ? 'copyright-fixed' : 'copyright-static'}`}>
                © 2026 LoLytics — Open Source (MIT License) ·{' '}
                <a
                    href="https://github.com/fqhd/LoLytics"
                    target="_blank"
                    rel="noreferrer"
                    className="github"
                >
                    View on GitHub
                </a>
            </footer>
        </div>
    );
}

export default function App() {
    return (
        <Router>
            <Layout />
        </Router>
    );
}