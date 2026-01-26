import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, CheckCircle2, XCircle, BrainCircuit, Loader2, Link as LinkIcon, History, ExternalLink, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchWikiArticle, generateQuizFromExtract, WikiQuizQuestion } from './wikiService';
import './App.css';

interface HistoryItem {
    url: string;
    topic: string;
    score: number;
    total: number;
    date: string;
    results: { question: string, answer: string, selected: string, isCorrect: boolean }[];
}

function App() {
    const [loading, setLoading] = useState(false);
    const [inputUrl, setInputUrl] = useState('');
    const [quiz, setQuiz] = useState<WikiQuizQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [currentResults, setCurrentResults] = useState<HistoryItem['results']>([]);
    const [articleTitle, setArticleTitle] = useState('');
    const [lastScoreForUrl, setLastScoreForUrl] = useState<number | null>(null);

    useEffect(() => {
        const savedHistory = localStorage.getItem('wiki_quiz_history');
        if (savedHistory) {
            setHistory(JSON.parse(savedHistory));
        }
    }, []);

    useEffect(() => {
        if (inputUrl) {
            const existing = history.find(h => h.url.includes(inputUrl) || inputUrl.includes(h.url));
            setLastScoreForUrl(existing ? existing.score : null);
        } else {
            setLastScoreForUrl(null);
        }
    }, [inputUrl, history]);

    const saveToHistory = (item: HistoryItem) => {
        const newHistory = [item, ...history].filter((v, i, a) => a.findIndex(t => t.url === v.url && t.date === v.date) === i);
        setHistory(newHistory);
        localStorage.setItem('wiki_quiz_history', JSON.stringify(newHistory));
    };

    const startQuiz = async (url: string) => {
        if (!url) return;
        setLoading(true);
        setQuiz([]);
        setCurrentIndex(0);
        setScore(0);
        setShowResult(false);
        setSelectedOption(null);
        setIsCorrect(null);
        setCurrentResults([]);
        setLastScoreForUrl(null);

        // Check history for this URL
        const existing = history.find(h => h.url.includes(url) || url.includes(h.url));
        if (existing) {
            setLastScoreForUrl(existing.score);
        }

        try {
            const article = await fetchWikiArticle(url);
            setArticleTitle(article.title);
            const generatedQuiz = generateQuizFromExtract(article.title, article.extract);
            if (generatedQuiz.length === 0) throw new Error("Could not generate questions");
            setQuiz(generatedQuiz);
        } catch (error) {
            alert("Couldn't extract content from that link. Please make sure it's a valid Wikipedia article.");
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (option: string) => {
        if (selectedOption) return;

        setSelectedOption(option);
        const correct = option === quiz[currentIndex].answer;
        setIsCorrect(correct);

        const result = {
            question: quiz[currentIndex].question,
            answer: quiz[currentIndex].answer,
            selected: option,
            isCorrect: correct
        };
        setCurrentResults(prev => [...prev, result]);

        if (correct) setScore(s => s + 1);

        setTimeout(() => {
            if (currentIndex < quiz.length - 1) {
                setCurrentIndex(c => c + 1);
                setSelectedOption(null);
                setIsCorrect(null);
            } else {
                const finalScore = score + (correct ? 1 : 0);
                const historyItem: HistoryItem = {
                    url: inputUrl,
                    topic: articleTitle,
                    score: finalScore,
                    total: quiz.length,
                    date: new Date().toLocaleString(),
                    results: [...currentResults, result]
                };
                saveToHistory(historyItem);
                setShowResult(true);
                setInputUrl('');
            }
        }, 1500);
    };

    return (
        <div className="app-container">
            <header>
                <div className="logo-section">
                    <div className="logo">
                        <BrainCircuit size={42} className="logo-icon" />
                        <h1>WikiQuiz</h1>
                    </div>
                    <p className="subtitle">Strict Content-Based MCQ Generator</p>
                </div>

                <div className="search-area">
                    <div className="input-group">
                        <LinkIcon className="input-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Paste Wikipedia Article URL..."
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && startQuiz(inputUrl)}
                        />
                        <button className="btn-generate" onClick={() => startQuiz(inputUrl)} disabled={loading || !inputUrl}>
                            {loading ? <Loader2 className="animate-spin" /> : "Generate Quiz"}
                        </button>
                    </div>
                    {lastScoreForUrl !== null && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="last-score-badge">
                            Last score for this URL: {lastScoreForUrl}/5
                        </motion.div>
                    )}
                </div>
            </header>

            <div className="main-layout">
                <main className="content-area">
                    <AnimatePresence mode="wait">
                        {!quiz.length && !loading && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card welcome-card"
                            >
                                <div className="welcome-content">
                                    <div className="icon-circle">
                                        <History size={48} />
                                    </div>
                                    <h2>Ready to Test Your Knowledge?</h2>
                                    <p>Paste any Wikipedia link above to generate a 5-question MCQ quiz based strictly on its content.</p>

                                    {history.length > 0 && (
                                        <div className="history-preview">
                                            <h3>Recent Quizzes</h3>
                                            <div className="history-list">
                                                {history.slice(0, 3).map((item, i) => (
                                                    <div key={i} className="history-item small" onClick={() => { setInputUrl(item.url); startQuiz(item.url); }}>
                                                        <div className="item-info">
                                                            <span className="item-topic">{item.topic}</span>
                                                            <span className="item-date">{item.date}</span>
                                                        </div>
                                                        <div className="item-score">{item.score}/{item.total}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {loading && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="loading-state">
                                <Loader2 size={64} className="animate-spin primary-spinner" />
                                <div className="loading-text">
                                    <h3>Analyzing Article...</h3>
                                    <p>Extracting strictly relevant content for your quiz.</p>
                                </div>
                            </motion.div>
                        )}

                        {quiz.length > 0 && !showResult && (
                            <motion.div
                                key={currentIndex}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="glass-card quiz-card"
                            >
                                <div className="quiz-info">
                                    <div className="topic-tag">{articleTitle}</div>
                                    <div className="progress-section">
                                        <span className="progress-text">Question {currentIndex + 1} of {quiz.length}</span>
                                        <div className="progress-container">
                                            <div className="progress-bar" style={{ width: `${((currentIndex + 1) / quiz.length) * 100}%` }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="question-box">
                                    <p className="question-text">{quiz[currentIndex].question}</p>
                                </div>

                                <div className="options-grid">
                                    {quiz[currentIndex].options.map((option, idx) => (
                                        <button
                                            key={idx}
                                            className={`option-btn ${selectedOption === option ? (isCorrect ? 'correct' : 'wrong') : ''} ${selectedOption && option === quiz[currentIndex].answer ? 'correct' : ''}`}
                                            onClick={() => handleAnswer(option)}
                                            disabled={!!selectedOption}
                                        >
                                            <span className="option-label">{String.fromCharCode(65 + idx)}</span>
                                            <span className="option-text">{option}</span>
                                            {selectedOption === option && (
                                                isCorrect ? <CheckCircle2 size={20} className="status-icon" /> : <XCircle size={20} className="status-icon" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {showResult && (
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="glass-card results-container"
                            >
                                <div className="results-header">
                                    <div className="score-circle">
                                        <span className="final-score">{score}</span>
                                        <span className="total-score">/ {quiz.length}</span>
                                    </div>
                                    <div className="result-titles">
                                        <h2>Quiz Completed!</h2>
                                        <p className="topic-name">{articleTitle}</p>
                                    </div>
                                </div>

                                <div className="results-summary">
                                    <h3>Review Your Answers</h3>
                                    <div className="answers-review">
                                        {currentResults.map((res, i) => (
                                            <div key={i} className={`review-item ${res.isCorrect ? 'is-correct' : 'is-wrong'}`}>
                                                <div className="review-q">
                                                    <span className="q-num">{i + 1}</span>
                                                    <p>{res.question}</p>
                                                </div>
                                                <div className="review-a">
                                                    <div className="user-choice">
                                                        <span className="label">You:</span>
                                                        <span className="val">{res.selected}</span>
                                                    </div>
                                                    {!res.isCorrect && (
                                                        <div className="correct-choice">
                                                            <span className="label">Correct:</span>
                                                            <span className="val">{res.answer}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="result-actions">
                                    <button className="btn-primary retry-btn" onClick={() => startQuiz(inputUrl)}>
                                        <RotateCcw size={18} /> Take Quiz Again
                                    </button>
                                    <button className="btn-secondary" onClick={() => { setQuiz([]); setShowResult(false); }}>
                                        Home
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>

                <aside className="sidebar">
                    <div className="glass-card history-sidebar">
                        <div className="sidebar-header">
                            <History size={20} />
                            <h3>History</h3>
                        </div>
                        <div className="history-scroll">
                            {history.length === 0 ? (
                                <p className="empty-history">No past quizzes found.</p>
                            ) : (
                                history.map((item, i) => (
                                    <div key={i} className="history-card" onClick={() => { setInputUrl(item.url); startQuiz(item.url); }}>
                                        <div className="hist-top">
                                            <span className="hist-topic">{item.topic}</span>
                                            <span className="hist-score">{item.score}/{item.total}</span>
                                        </div>
                                        <div className="hist-bottom">
                                            <span className="hist-date">{item.date}</span>
                                            <ChevronRight size={14} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </aside>
            </div>

            <footer>
                <div className="footer-content">
                    <span>Powered by Wikipedia API</span>
                    <span className="separator">•</span>
                    <span>Port 5174</span>
                </div>
            </footer>
        </div>
    );
}

export default App;
