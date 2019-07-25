import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { createSelector } from 'reselect';
import { connect } from 'react-redux';
import { withRouter, Link } from 'react-router-dom';
import omit from 'lodash/omit';
import querystring from 'querystring';
import identity from 'lodash/identity';
import { getId, unprefix } from '@scipe/jsonld';
import Iconoclass from '@scipe/iconoclass';
import { getScopeId, getVersion, getResultId } from '@scipe/librarian';
import { Version } from '@scipe/ui';
import Counter from '../utils/counter';
import EditableResource from './editable-resource';
import { NoAccessNotice } from './notice';
import { createActionMapSelector } from '../selectors/graph-selectors';
import { getSelectorGraphParam } from '../utils/annotations';
import { getDisplayVersion } from '../utils/graph-utils';
import Permalink from './permalink';
import VersionRadioButtons from './version-radio-buttons';

class FilesAttachment extends React.PureComponent {
  static propTypes = {
    user: PropTypes.object.isRequired,
    acl: PropTypes.object.isRequired,
    journalId: PropTypes.string.isRequired,
    graphId: PropTypes.string.isRequired,
    action: PropTypes.shape({
      identifier: PropTypes.string.isRequired,
      actionStatus: PropTypes.string.isRequired,
      object: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
      '@type': PropTypes.oneOf([
        'CreateReleaseAction',
        'TypesettingAction',
        'PublishAction'
      ]).isRequired
    }).isRequired,
    prevCreateReleaseAction: PropTypes.object,
    search: PropTypes.string.isRequired, // the search value of the parent counter
    displayedVersion: PropTypes.string,

    nodeMap: PropTypes.object, // required for TypesettingAction: used to shortcut the graphData to preview typesetting actions

    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,

    forceEnableUpdateMainEntityEncoding: PropTypes.bool, // for `TypesettingAction` we only allow to update the main entity encoding (not the parts) => we set `disabled` to `true` this props allows to overwrite that

    createSelector: PropTypes.func,
    matchingLevel: PropTypes.number,
    annotable: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    blindingData: PropTypes.object.isRequired,

    forwardedRef: PropTypes.any,

    // react router
    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,

    // redux
    // Note: those variables will be for the prev versions if we are viewing the prev version
    graph: PropTypes.object,
    hasUploadAction: PropTypes.bool
  };

  static defaultProps = {
    embedded: false,
    displayAnnotations: true,
    createSelector: identity
  };

  constructor(props) {
    super(props);

    this.counterCache = {};
  }

  handleToggleVersion = nextVersion => {
    const { history, location } = this.props;

    history.push({
      pathname: location.pathname,
      search: `?${querystring.stringify(
        Object.assign(querystring.parse(location.search.substring(1)), {
          version: nextVersion
        })
      )}`
    });
  };

  createCounter(isViewingPrevVersion, query) {
    const { journalId, graphId, action, displayedVersion } = this.props;

    const key = `${getSelectorGraphParam(action)}-${displayedVersion}`;
    if (key in this.counterCache) {
      return this.counterCache[key];
    }

    const [major, minor] = (
      displayedVersion ||
      getVersion(getSelectorGraphParam(action)) ||
      ''
    ).split('.');

    const counter = new Counter({
      origin: window.location.origin,
      pathname: `/${unprefix(journalId)}/${unprefix(
        getScopeId(graphId)
      )}/submission`,
      hashLevel: 3,
      search: isViewingPrevVersion
        ? `?${querystring.stringify(
            Object.assign({}, query, { version: displayedVersion })
          )}`
        : `?${querystring.stringify(omit(query, ['version']))}`,
      counts: [major, minor, 'A', 0, 0],
      prefix: 'v'
    });

    this.counterCache[key] = counter;

    return this.counterCache[key];
  }

  render() {
    const {
      acl,
      user,
      action,
      displayedVersion,
      graphId,
      graph,
      search,
      nodeMap,
      annotable,
      readOnly,
      forceEnableUpdateMainEntityEncoding,
      disabled,
      displayAnnotations,
      blindingData,
      createSelector,
      matchingLevel,
      forwardedRef,
      prevCreateReleaseAction,
      hasUploadAction
    } = this.props;

    const resourceId =
      action['@type'] === 'TypesettingAction'
        ? getId(action.object.encodesCreativeWork)
        : getId(graph && graph.mainEntity);

    const isViewingPrevVersion =
      action['@type'] === 'CreateReleaseAction' &&
      prevCreateReleaseAction &&
      displayedVersion &&
      displayedVersion !== getVersion(getResultId(action));

    const canPerform = isViewingPrevVersion
      ? false
      : acl.checkPermission(user, 'PerformActionPermission', {
          action
        });

    const canView = acl.checkPermission(user, 'ViewActionPermission', {
      action: isViewingPrevVersion ? prevCreateReleaseAction : action
    });

    const query = querystring.parse(search.substring(1));

    const counter = this.createCounter(isViewingPrevVersion, query);

    return (
      <section
        ref={forwardedRef}
        id={action.identifier}
        className={classNames('files-attachment', {
          'files-attachment--previous-version': isViewingPrevVersion,
          'files-attachment--current-version': !isViewingPrevVersion
        })}
        data-testid="files-attachment"
      >
        <Permalink first={true} counter={counter} />

        <header className="files-attachment__header selectable-indent">
          <h2 className="annotable-action__attachment-title">
            <Iconoclass
              iconName="attachment"
              className="annotable-action__attachment-title-icon"
            />
            {action['@type'] === 'TypesettingAction'
              ? 'Typeset document'
              : 'Files'}
          </h2>

          {action['@type'] === 'CreateReleaseAction' &&
            prevCreateReleaseAction && (
              <div className="files-attachment__header__version-menu">
                <VersionRadioButtons
                  prevVersion={prevCreateReleaseAction.result.version}
                  currVersion={getVersion(getResultId(action))}
                  value={displayedVersion || getVersion(getResultId(action))}
                  onChange={this.handleToggleVersion}
                />
              </div>
            )}
        </header>

        {!!prevCreateReleaseAction && (
          <div className="files-attachment__version">
            <Iconoclass
              round={true}
              iconName={isViewingPrevVersion ? 'versionPast' : 'version'}
              className={
                isViewingPrevVersion
                  ? 'files-attachment__version__icon files-attachment__version__icon--warning'
                  : 'files-attachment__version__icon'
              }
            />

            {isViewingPrevVersion ? (
              <span>
                You are viewing a previous version of the files (
                <Version type="prev">
                  {getDisplayVersion(displayedVersion, { semverLight: true })}
                </Version>
                ). Revision requests{' '}
                {action.actionStatus === 'CompletedActionStatus'
                  ? 'were'
                  : 'are being'}{' '}
                addressed in version{' '}
                <Link
                  to={{
                    pathname: location.pathname,
                    search: `?${querystring.stringify(
                      Object.assign({}, query, {
                        version: getVersion(getResultId(action))
                      })
                    )}`
                  }}
                >
                  <Version>
                    {getDisplayVersion(getVersion(getResultId(action)), {
                      semverLight: true
                    })}
                  </Version>
                </Link>
                .
              </span>
            ) : (
              <span>
                {hasUploadAction
                  ? `You are viewing a revised version of the files (${getDisplayVersion(
                      getVersion(getResultId(action)),
                      { semverLight: true }
                    )}), addressing`
                  : 'Upload new revision of the files in response to'}{' '}
                the revision requests from version{' '}
                <Link
                  to={{
                    pathname: location.pathname,
                    search: `?${querystring.stringify(
                      Object.assign({}, query, {
                        version: prevCreateReleaseAction.result.version
                      })
                    )}`
                  }}
                >
                  <Version type="prev">
                    {getDisplayVersion(prevCreateReleaseAction.result.version, {
                      semverLight: true
                    })}
                  </Version>
                </Link>
                .
              </span>
            )}
          </div>
        )}

        {canView && graph && resourceId ? (
          <EditableResource
            key={
              `${isViewingPrevVersion ? getId(graph) : graphId}-${
                isViewingPrevVersion
                  ? getId(prevCreateReleaseAction)
                  : getId(action)
              }` /* This is important so that react trash the previous tree when we toggle versions */
            }
            className="editable-resource--primary"
            graphId={isViewingPrevVersion ? getId(graph) : graphId}
            actionId={
              isViewingPrevVersion
                ? getId(prevCreateReleaseAction)
                : getId(action)
            }
            nodeMap={isViewingPrevVersion ? undefined : nodeMap}
            canPerform={canPerform}
            forceEnableUpdateMainEntityEncoding={
              isViewingPrevVersion ? false : forceEnableUpdateMainEntityEncoding
            }
            resourceId={resourceId}
            counter={counter}
            readOnly={readOnly || !!isViewingPrevVersion}
            disabled={disabled || !!isViewingPrevVersion}
            annotable={annotable}
            displayAnnotations={displayAnnotations}
            createSelector={createSelector}
            matchingLevel={matchingLevel}
            blindingData={blindingData}
          />
        ) : (
          <div className="selectable-indent">
            <NoAccessNotice />
          </div>
        )}
      </section>
    );
  }
}

export default withRouter(
  connect(
    createSelector(
      (state, props) => {
        const { action, prevCreateReleaseAction, displayedVersion } = props;

        const isViewingPrevVersion =
          action['@type'] === 'CreateReleaseAction' &&
          prevCreateReleaseAction &&
          displayedVersion &&
          displayedVersion !== getVersion(getResultId(action));

        return isViewingPrevVersion ? prevCreateReleaseAction : action;
      },
      createActionMapSelector(),
      (state, props) => {
        const { scopeMap } = state;
        const {
          graphId,
          action,
          prevCreateReleaseAction,
          displayedVersion
        } = props;

        const isViewingPrevVersion =
          action['@type'] === 'CreateReleaseAction' &&
          prevCreateReleaseAction &&
          displayedVersion &&
          displayedVersion !== getVersion(getResultId(action));

        const scopeId = getScopeId(graphId);
        if (scopeId in scopeMap) {
          const graphMap = scopeMap[scopeId].graphMap;

          return isViewingPrevVersion
            ? graphMap[`${scopeId}?version=${displayedVersion}`]
            : graphMap[graphId];
        }
      },
      (action, actionMap, graphData) => {
        const hasUploadAction = !!Object.values(actionMap).find(
          _action =>
            _action['@type'] === 'UploadAction' &&
            _action.actionStatus === 'CompletedActionStatus' &&
            getId(_action.instrumentOf) === getId(action)
        );

        return {
          graph: graphData && graphData.graph,
          hasUploadAction
        };
      }
    )
  )(FilesAttachment)
);
