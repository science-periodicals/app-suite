import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId, arrayify } from '@scipe/jsonld';
import { WEBIFY_ACTION_TYPES } from '@scipe/librarian';
import { ActionProgressLog } from '@scipe/ui';
import { getDefaultEvents, getEventTree } from '../utils/events';

export default class ProgressLogger extends Component {
  static propTypes = {
    action: PropTypes.object,
    ioActions: PropTypes.arrayOf(PropTypes.object), // Array of latest UploadAction, webify action, update action associated with webify action and service actions (typesetting etc.) if any in that order
    resourceId: PropTypes.string.isRequired
  };

  static defaultProps = {
    ioActions: []
  };

  render() {
    let { action, ioActions } = this.props;

    const uploadAction = arrayify(ioActions).find(
      ioAction => ioAction['@type'] === 'UploadAction'
    );
    const webifyAction = arrayify(ioActions).find(ioAction =>
      WEBIFY_ACTION_TYPES.has(ioAction['@type'])
    );
    const updateAction = arrayify(ioActions).find(
      ioAction => ioAction['@type'] === 'UpdateAction'
    );

    const typesettingAction = ioActions.find(
      action => action['@type'] === 'TypesettingAction'
    );

    if (getId(action) === getId(typesettingAction)) {
      ioActions = ioActions.filter(
        action => action['@type'] !== 'TypesettingAction'
      );
    } else if (
      typesettingAction &&
      typesettingAction.actionStatus !== 'CompletedActionStatus'
    ) {
      ioActions = ioActions.filter(
        action =>
          action['@type'] !== 'DocumentProcessingAction' &&
          action['@type'] !== 'UpdateAction'
      );
    }

    if (
      (uploadAction && uploadAction.actionStatus === 'CanceledActionStatus') ||
      (webifyAction && webifyAction.actionStatus === 'CanceledActionStatus')
    ) {
      ioActions = ioActions.filter(
        action =>
          !WEBIFY_ACTION_TYPES.has(action['@type']) &&
          action['@type'] !== 'UpdateAction'
      );
    }

    return (
      <div className="progress-logger">
        {ioActions.length ? (
          <div className="progress-logger__logs">
            {/* Note: ConnectedActionProgressLog has the `events` prop injected */}
            {ioActions.map((action, i) => (
              <ConnectedActionProgressLog key={action['@id']} action={action} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }
}

// we connect ActionProgressLog to inject the `events` props
function makeSelector() {
  return createSelector(
    (state, props) => props.action,
    (state, props) => state.progressEventMapByActionId[getId(props.action)],
    (action = {}, progressEventMap = {}) => {
      const events = getEventTree(progressEventMap) || getDefaultEvents(action);

      return { events };
    }
  );
}

function makeMapStateToProps() {
  const s = makeSelector();
  return (state, props) => {
    return s(state, props);
  };
}

var ConnectedActionProgressLog = connect(makeMapStateToProps)(
  ActionProgressLog
);
