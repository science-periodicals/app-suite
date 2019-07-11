import { createSelectorCreator, defaultMemoize } from 'reselect';

export default createSelectorCreator(defaultMemoize, (curr, prev) => {
  if (Array.isArray(curr) && Array.isArray(prev)) {
    if (curr.length !== prev.length) return false;
    for (let i = 0; i < curr.length; i++) {
      if (curr[i] !== prev[i]) {
        return false;
      }
    }
    return true;
  } else {
    return curr === prev;
  }
});
