import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import uniqBy from 'lodash/uniqBy';
import noop from 'lodash/noop';
import { getId } from '@scipe/jsonld';
import Iconoclass from '@scipe/iconoclass';
import {
  ActionIdentifier,
  API_LABELS,
  PaperCheckbox,
  getIconNameFromSchema
} from '@scipe/ui';
import { isActionAssigned, getStageActions } from '@scipe/librarian';
import {
  createActionMapSelector,
  createGraphAclSelector
} from '../selectors/graph-selectors';
import { getSortedStages } from '../utils/workflow';

class AssignableActionsPicker extends React.Component {
  static propTypes = {
    className: PropTypes.string,
    graphId: PropTypes.string.isRequired,
    roleName: PropTypes.oneOf(['editor', 'reviewer', 'author', 'producer']),
    subRoleName: PropTypes.string,
    disabled: PropTypes.bool.isRequired,
    selectedActionIds: PropTypes.arrayOf(PropTypes.string).isRequired,
    onChange: PropTypes.func,

    // redux
    actions: PropTypes.arrayOf(PropTypes.object)
  };

  static defaultProps = {
    onChange: noop
  };

  handleToggle(actionId, e) {
    const { onChange, selectedActionIds } = this.props;

    const nextSelectedActionIds = selectedActionIds.includes(actionId)
      ? selectedActionIds.filter(id => id !== actionId)
      : selectedActionIds.concat(actionId);
    onChange(nextSelectedActionIds);
  }

  render() {
    const { actions, disabled, className, selectedActionIds } = this.props;

    if (!actions.length) {
      return null;
    }

    return (
      <div className={classNames(className, 'assignable-actions-picker')}>
        <h3 className="assignable-actions-picker__title">Assign to:</h3>
        <ul className={'sa__clear-list-styles'}>
          {actions.map(action => (
            <li key={getId(action)}>
              <PaperCheckbox
                onClick={this.handleToggle.bind(this, getId(action))}
                checked={selectedActionIds.includes(getId(action))}
                disabled={disabled}
              >
                <span className="assignable-actions-picker__item">
                  <Iconoclass
                    tagName="span"
                    iconName={getIconNameFromSchema(action)}
                  />
                  {API_LABELS[action['@type']]} action
                  <ActionIdentifier>{action.identifier}</ActionIdentifier>
                </span>
              </PaperCheckbox>
            </li>
          ))}
        </ul>
      </div>
    );
  }
}

export default connect(
  createSelector(
    state => state.user,
    createGraphAclSelector(),
    (state, props) => props.roleName,
    (state, props) => props.subRoleName,
    createActionMapSelector(),
    (user, acl, roleName, subRoleName, actionMap) => {
      const stages = getSortedStages(actionMap);
      const actions = getStageActions(stages[0]).filter(
        action =>
          !isActionAssigned(action) &&
          acl.checkPermission(user, 'AssignActionPermission', { action }) &&
          action.agent.roleName === roleName &&
          (!action.agent.name || action.agent.name === subRoleName)
      );

      return {
        actions: uniqBy(actions, action => action.instanceOf) // be sure to not let assign the same user to several polyton actions
      };
    }
  )
)(AssignableActionsPicker);
