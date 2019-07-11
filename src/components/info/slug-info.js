import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId } from '@scipe/jsonld';
import { getStageActions } from '@scipe/librarian';
import { getSortedStages } from '../../utils/workflow';
import {
  createActionMapSelector,
  createFirstAuthorFamilyNameSelector
} from '../../selectors/graph-selectors';
import { ERROR_SLUG } from '../../constants';

class SlugInfo extends React.Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    annotation: PropTypes.object.isRequired,

    // redux
    action: PropTypes.object.isRequired,
    firstAuthorFamilyName: PropTypes.string
  };

  static defaultProps = {
    action: {}
  };

  render() {
    const { annotation, action, firstAuthorFamilyName } = this.props;

    const date =
      action.result && action.result.datePublished
        ? new Date(action.result.datePublished)
        : new Date();

    return (
      <p>
        {annotation.object === ERROR_SLUG ? 'Missing' : 'Non standard'}{' '}
        <strong>slug</strong>. It is recommended to use the first author family
        name{' '}
        {!!firstAuthorFamilyName && (
          <Fragment>
            (<strong>{firstAuthorFamilyName.toLowerCase()}</strong>)
          </Fragment>
        )}{' '}
        followed by the publication year (<strong>{date.getFullYear()}</strong>)
        and a disambiguation letter (a,b,c etc.) if that slug{' '}
        {firstAuthorFamilyName && (
          <Fragment>
            (
            <strong>
              {firstAuthorFamilyName.toLowerCase()}
              {date.getFullYear()})
            </strong>
          </Fragment>
        )}{' '}
        is not unique.
      </p>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => getId(props.annotation.selector.node),
    createActionMapSelector(),
    createFirstAuthorFamilyNameSelector(),
    (actionId, actionMap, firstAuthorFamilyName) => {
      let action = actionMap[actionId];
      // we may not have access to the action => we try to get it from the stage data
      if (!action) {
        const stages = getSortedStages(actionMap);
        for (const stage of stages) {
          const _action = getStageActions(stage).find(
            action => getId(action) === actionId
          );
          if (_action) {
            action = _action;
            break;
          }
        }
      }

      return { firstAuthorFamilyName, action };
    }
  )
)(SlugInfo);
