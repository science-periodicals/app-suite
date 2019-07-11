import { arrayify } from '@scipe/jsonld';
import { PRE_SUBMISSION_COMMENT } from '@scipe/librarian';

export function getPreSubmissionComment(periodical = {}) {
  return arrayify(periodical.comment).find(
    comment => comment.identifier === PRE_SUBMISSION_COMMENT
  );
}
