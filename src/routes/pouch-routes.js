import { Router } from 'express';
import { acl } from '@scipe/api';

const router = new Router({ caseSensitive: true });

router.post('/status', acl(), (req, res, next) => {
  delete req.session.resetPouchDB;
  res.status(204).end();
});

export default router;
