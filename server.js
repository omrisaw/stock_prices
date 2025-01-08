const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path'); // Import path module

const app = express();
const db = new sqlite3.Database(':memory:');

app.use(cors());
app.use(express.json());

// Serve static files (e.g., index.html)
app.use(express.static(path.join(__dirname, 'public')));

// Create stocks table
db.run(`CREATE TABLE stocks (symbol TEXT)`);

// API Routes
app.get('/stocks', (req, res) => {
    db.all(`SELECT symbol FROM stocks`, [], (err, rows) => {
        if (err) return res.status(500).send(err);
        res.json(rows.map(row => row.symbol));
    });
});

app.post('/stocks', (req, res) => {
    const { symbol } = req.body;
    if (!symbol) return res.status(400).send('Stock symbol is required');
    db.run(`INSERT INTO stocks (symbol) VALUES (?)`, [symbol], err => {
        if (err) return res.status(500).send(err);
        res.sendStatus(200);
    });
});

app.delete('/stocks/:symbol', (req, res) => {
    const { symbol } = req.params;
    db.run(`DELETE FROM stocks WHERE symbol = ?`, [symbol], err => {
        if (err) return res.status(500).send(err);
        res.sendStatus(200);
    });
});

app.get('/prices', async (req, res) => {
    db.all(`SELECT symbol FROM stocks`, [], async (err, rows) => {
        if (err) return res.status(500).send(err);
        const prices = await Promise.all(
            rows.map(async row => {
                try {
                    const response = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${row.symbol}&token=API_KEY`);
                    return { symbol: row.symbol, price: response.data.c };
                } catch {
                    return { symbol: row.symbol, price: 'Error' };
                }
            })
        );
        res.json(prices);
    });
});

// Fallback route for undefined paths
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
