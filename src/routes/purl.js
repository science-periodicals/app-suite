import { Router } from 'express';
import createError from '@scipe/create-error';
import addLibrarian from '../middlewares/add-librarian';

const router = new Router({ caseSensitive: true });

/**
 * req.params.id is a slug or a graphId
 */
router.get('/:id', addLibrarian, (req, res, next) => {
  req.librarian.get(
    req.params.id,
    { acl: false, nodes: false, potentialAction: false },
    (err, graph) => {
      if (err) return next(err);
      if (!graph.url) {
        return next(createError(404));
      }
      res.redirect(graph.url);
    }
  );
});

export default router;
