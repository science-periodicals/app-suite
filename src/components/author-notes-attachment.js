import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import identity from 'lodash/identity';
import { createSelector } from 'reselect';
import flatten from 'lodash/flatten';
import { withRouter } from 'react-router-dom';
import {
  getStageId,
  getStageActions,
  getObjectId,
  getScopeId,
  getLocationIdentifier
} from '@scipe/librarian';
import { getId, arrayify, unprefix } from '@scipe/jsonld';
import Attachment from './attachment';
import Counter from '../utils/counter';
import { getAnnotableQueryParameters } from '../utils/annotations';
import { createActionMapSelector } from '../selectors/graph-selectors';
import { getWorkflowAction } from '../utils/workflow';
import ReleaseNotesEditor from './release-notes-editor';
import AnnotableAuthorResponseList from './annotable-author-response-list';
import ActionAnnotationPreviewList from './action-annotation-preview-list';

class AuthorNotesAttachment extends React.PureComponent {
  static propTypes = {
    user: PropTypes.object.isRequired,
    journalId: PropTypes.string.isRequired,
    graph: PropTypes.object.isRequired,
    search: PropTypes.string.isRequired, // the search value of the parent counter

    graphId: PropTypes.string.isRequired,
    createReleaseActionId: PropTypes.string.isRequired,

    acl: PropTypes.object.isRequired,
    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    canComment: PropTypes.bool,

    createSelector: PropTypes.func,
    matchingLevel: PropTypes.number,
    annotable: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,
    blindingData: PropTypes.object.isRequired,
    reviewAttachmentLinkType: PropTypes.oneOf(['shell', 'transition']),

    // redux
    createReleaseAction: PropTypes.object,
    assessAction: PropTypes.object,
    createReleaseActionAuthorizeActions: PropTypes.arrayOf(PropTypes.object),
    createReleaseActionStageIndex: PropTypes.number.isRequired,
    createReleaseActionActionIndex: PropTypes.number.isRequired
  };

  static defaultProps = {
    reviewAction: {},
    createSelector: identity
  };

  constructor(props) {
    super(props);

    this.counterCache = {};
  }

  createCounter() {
    const {
      journalId,
      search,
      graph,
      createReleaseAction,
      createReleaseActionStageIndex,
      createReleaseActionActionIndex
    } = this.props;

    const key = `${getId(graph)}-${getId(
      createReleaseAction
    )}-${createReleaseActionStageIndex}-${createReleaseActionActionIndex}`;
    if (key in this.counterCache) {
      return this.counterCache[key];
    }

    const counter = new Counter({
      origin: window.location.origin,
      pathname: `/${unprefix(journalId)}/${unprefix(
        getScopeId(getId(graph))
      )}/submission`,
      hashLevel: 3,
      search: search,
      counts: [
        createReleaseActionStageIndex,
        createReleaseActionActionIndex,
        getLocationIdentifier('CreateReleaseAction'),
        0
      ]
    });

    this.counterCache[key] = counter;

    return this.counterCache[key];
  }

  render() {
    const {
      user,
      graphId,
      acl,
      journalId,
      graph,
      readOnly,
      disabled,
      canComment,
      annotable,
      displayAnnotations,
      displayPermalink,
      blindingData,
      createSelector,
      matchingLevel,
      createReleaseAction,
      assessAction,
      createReleaseActionAuthorizeActions,
      reviewAttachmentLinkType
    } = this.props;

    const counter = this.createCounter();

    return (
      <Attachment
        id={
          `${
            createReleaseAction.identifier
          }-inbound` /* used for the Resources ToC and needed to disambiguate from the Files attachment */
        }
        className="author-notes-attachment"
        user={user}
        acl={acl}
        title="Author Notes"
        action={createReleaseAction}
        authorizeActions={createReleaseActionAuthorizeActions}
        counter={counter}
        graph={graph}
        blindingData={blindingData}
      >
        <ReleaseNotesEditor
          graphId={graphId}
          graph={graph}
          counter={counter}
          action={createReleaseAction}
          canComment={canComment}
          readOnly={readOnly}
          disabled={disabled}
          annotable={annotable}
          displayAnnotations={displayAnnotations}
          displayPermalink={displayPermalink}
          createSelector={createSelector}
          matchingLevel={matchingLevel}
        />

        {!!arrayify(assessAction && assessAction.comment).length && (
          <section className="selectable-indent">
            <h4 className="annotable-action__sub-title">Responses</h4>

            <AnnotableAuthorResponseList
              graphId={graphId}
              selectable={false}
              counter={counter}
              annotable={annotable && canComment}
              displayAnnotations={displayAnnotations}
              displayPermalink={displayPermalink}
              createSelector={identity}
              assessAction={assessAction}
              createReleaseAction={createReleaseAction}
              reviewAttachmentLinkType={reviewAttachmentLinkType}
              readOnly={true}
              disabled={true}
            />
          </section>
        )}

        {!!(assessAction && arrayify(assessAction.annotation).length) && (
          <section className="selectable-indent">
            <h4 className="annotable-action__sub-title">
              In context responses
            </h4>

            <ActionAnnotationPreviewList
              user={user}
              journalId={journalId}
              search={counter.search}
              action={assessAction}
              graphId={graphId}
              addAuthorResponses={true}
              counter={counter}
              displayAnnotations={displayAnnotations}
              displayPermalink={displayPermalink}
              reviewAttachmentLinkType={reviewAttachmentLinkType}
              createSelector={identity}
              readOnly={true}
              disabled={true}
            />
          </section>
        )}
      </Attachment>
    );
  }
}

export default withRouter(
  connect(
    createSelector(
      state => state.user,
      (state, props) => props.acl,
      (state, props) => props.createReleaseActionId,
      createActionMapSelector(),
      (user, acl, createReleaseActionId, actionMap) => {
        const createReleaseAction = getWorkflowAction(createReleaseActionId, {
          actionMap,
          user,
          acl
        });

        const assessAction = getWorkflowAction(
          getId(createReleaseAction && createReleaseAction.instrument),
          {
            actionMap,
            user,
            acl
          }
        );

        const { stageIndex, actionIndex } = getAnnotableQueryParameters(
          {
            actionId: getId(createReleaseAction),
            stageId: getStageId(createReleaseAction)
          },
          actionMap
        );

        let authorizeActions;
        const stage = actionMap[getStageId(createReleaseAction)];
        if (stage) {
          const stageActions = getStageActions(stage);
          authorizeActions = flatten(
            stageActions.map(action =>
              arrayify(action.potentialAction).filter(
                action =>
                  action['@type'] === 'AuthorizeAction' &&
                  action.actionStatus !== 'CompletedActionStatus' &&
                  getObjectId(action) === getId(createReleaseAction)
              )
            )
          )
            .filter(Boolean)
            .map(action => actionMap[getId(action)] || action);
        }

        return {
          createReleaseAction,
          assessAction,
          createReleaseActionAuthorizeActions: authorizeActions,
          createReleaseActionStageIndex: stageIndex,
          createReleaseActionActionIndex: actionIndex
        };
      }
    )
  )(AuthorNotesAttachment)
);
