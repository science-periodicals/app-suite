import { createSelector } from 'reselect';
import { isSelectorEqual } from '../utils/annotations';

export function createIsBeingEditedSelector(
  mapPropsToSelector = props => props.selector // a function(props) returning a `Selector`
) {
  return createSelector(
    state => state.shell,
    (state, props) => mapPropsToSelector(props),
    (shell, selector = {}) => {
      // when the shell is used as an editor it has a type of edit and a selector prop
      const { isOpen, type, selector: _selector } = shell;
      if (type === 'edit' && isOpen && _selector) {
        return isSelectorEqual(selector, _selector);
      }
      return false;
    }
  );
}
