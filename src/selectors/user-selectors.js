import { createSelector } from 'reselect';
import { arrayify } from '@scipe/jsonld';

export function createReadOnlyUserSelector() {
  return createSelector(
    state => state.user,
    (user = {}) => {
      return arrayify(user.roles).includes('readOnlyUser');
    }
  );
}
