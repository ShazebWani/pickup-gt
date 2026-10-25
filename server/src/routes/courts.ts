import { Router } from 'express';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { db } from '../services/firestore';
import { COURT_VENUE_ID, parseReport, readCourtStatuses, saveCourtReport } from '../services/courtReports';

const router = Router();
router.use(requireAuth);
router.use('/:venueId/courts', (req, res, next) => {
  if (req.params.venueId !== COURT_VENUE_ID) {
    res.status(404).json({ error: 'Court reporting is available for the CRC Main Gym only.' });
    return;
  }
  next();
});
router.get('/:venueId/courts', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    res.json(await readCourtStatuses(db));
  } catch {
    res.status(503).json({ error: 'Court updates are unavailable. Please try again.' });
  }
});
router.post('/:venueId/courts/reports', async (req: AuthedRequest, res) => {
  const input = parseReport(req.body);
  if (!input) {
    res.status(400).json({ error: 'Choose a court (1–40 characters), a valid status, and an observation age from 0 to 120 minutes.' });
    return;
  }
  try {
    res.status(201).json(await saveCourtReport(db, req.uid!, input));
  } catch {
    res.status(503).json({ error: 'Could not save the court report. Please try again.' });
  }
});
export default router;
