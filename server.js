const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

// Initialize app and database
const app = express();
const db = new sqlite3.Database(':memory:'); // Use in-memory database for simplicity

// Middleware
app.use(express.json());
app.use(cors());

// Create stocks table
db.run(`CREATE TABLE stocks (symbol TEXT)`);

// Finnhub API details
const API_KEY = 'YOUR_FINNHUB_API_KEY';
const FINNHUB_URL = 'https://finnhub.io/api/v1/quote';

// Get all stocks
app.get('/stocks', (req, res) => {
    db.all(`SELECT symbol FROM stocks`, [], (err, rows) => {
        if (err) return res.status(500).send(err);
        res.json(rows.map(row => row.symbol));
    });
});

// Add a stock
app.post('/stocks', (req, res) => {
    const { symbol } = req.body;
    if (!symbol) return res.status(400).send('Stock symbol is required');
    db.run(`INSERT INTO stocks (symbol) VALUES (?)`, [symbol], err => {
        if (err) return res.status(500).send(err);
        res.sendStatus(200);
    });
});

// Remove a stock
app.delete('/stocks/:symbol', (req, res) => {
    const { symbol } = req.params;
    db.run(`DELETE FROM stocks WHERE symbol = ?`, [symbol], err => {
        if (err) return res.status(500).send(err);
        res.sendStatus(200);
    });
});

// Get stock prices
app.get('/prices', async (req, res) => {
    db.all(`SELECT symbol FROM stocks`, [], async (err, rows) => {
        if (err) return res.status(500).send(err);
        const prices = await Promise.all(
            rows.map(async row => {
                try {
                    const response = await axios.get(`${FINNHUB_URL}?symbol=${row.symbol}&token=${API_KEY}`);
                    return { symbol: row.symbol, price: response.data.c };
                } catch {
                    return { symbol: row.symbol, price: 'Error' };
                }
            })
        );
        res.json(prices);
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
