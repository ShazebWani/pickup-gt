import { Router } from 'express';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { variantFor } from '../services/experiment';

const router = Router();
router.use(requireAuth);
// The app asks once per launch which court card this player sees.
router.get('/variant', (req: AuthedRequest, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ variant: variantFor(req.uid!) });
});
export default router;
