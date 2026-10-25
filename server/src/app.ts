import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import gamesRouter from './routes/games';
import courtsRouter from './routes/courts';

export const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) => { res.json({ ok: true }); });
app.use('/api/games', gamesRouter);
app.use('/api/venues', courtsRouter);
app.use((_req, res) => { res.status(404).json({ error: 'Not found.' }); });
const bodyErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    res.status(err.type === 'entity.too.large' ? 413 : 400).json({ error: 'Invalid JSON request body.' });
    return;
  }
  next(err);
};
app.use(bodyErrorHandler);
