import { Librarian } from '@scipe/librarian';

export default function addLibrarian(req, res, next) {
  req.librarian = new Librarian(req);
  next();
}
