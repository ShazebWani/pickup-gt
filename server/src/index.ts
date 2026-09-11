import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import gamesRouter from './routes/games';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/games', gamesRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`Pickup GT API listening on port ${PORT}`);
});
