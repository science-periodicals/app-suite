import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import identity from 'lodash/identity';
import { createSelector } from 'reselect';
import flatten from 'lodash/flatten';
import {
  getStageId,
  getStageActions,
  getObjectId,
  getScopeId,
  getLocationIdentifier
} from '@scipe/librarian';
import { getId, arrayify, unprefix } from '@scipe/jsonld';
import { getDisplayName } from '@scipe/ui';
import Counter from '../utils/counter';
import ReviewEditor from './review-editor';
import { getAnnotableQueryParameters } from '../utils/annotations';
import { createActionMapSelector } from '../selectors/graph-selectors';
import { getWorkflowAction } from '../utils/workflow';
import AnnotableReviewerCommentList from './annotable-reviewer-comment-list';
import ActionAnnotationPreviewList from './action-annotation-preview-list';
import Attachment from './attachment';

class ReviewAttachment extends React.PureComponent {
  static propTypes = {
    user: PropTypes.object.isRequired,
    journalId: PropTypes.string.isRequired,
    graph: PropTypes.object.isRequired,
    search: PropTypes.string.isRequired, // the search value of the parent counter

    graphId: PropTypes.string.isRequired,
    reviewActionId: PropTypes.string.isRequired,

    acl: PropTypes.object.isRequired,
    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,

    createSelector: PropTypes.func,
    matchingLevel: PropTypes.number,
    annotable: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,
    blindingData: PropTypes.object.isRequired,

    // redux
    reviewAction: PropTypes.object,
    reviewActionAuthorizeActions: PropTypes.arrayOf(PropTypes.object),
    reviewActionStageIndex: PropTypes.number.isRequired,
    reviewActionActionIndex: PropTypes.number.isRequired
  };

  static defaultProps = {
    createSelector: identity,
    reviewAction: {}
  };

  constructor(props) {
    super(props);

    this.counterCache = {};
  }

  createCounter() {
    const {
      search,
      graph,
      journalId,
      reviewActionId,
      reviewActionStageIndex,
      reviewActionActionIndex
    } = this.props;

    const key = `${reviewActionId}-${reviewActionStageIndex}-${reviewActionActionIndex}`;
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
        reviewActionStageIndex,
        reviewActionActionIndex,
        getLocationIdentifier('ReviewAction'),
        0
      ]
    });

    this.counterCache[key] = counter;

    return this.counterCache[key];
  }

  render() {
    const {
      journalId,
      reviewAction,
      user,
      graph,
      acl,
      blindingData,
      reviewActionAuthorizeActions,
      graphId,
      annotable,
      displayAnnotations,
      displayPermalink,
      createSelector,
      matchingLevel,
      search
    } = this.props;

    const counter = this.createCounter();

    return (
      <Attachment
        id={reviewAction.identifier}
        className="review-attachment"
        user={user}
        acl={acl}
        title={`${getDisplayName(blindingData, reviewAction.agent, {
          addRoleNameSuffix: false
        })} Review`}
        action={reviewAction}
        authorizeActions={reviewActionAuthorizeActions}
        counter={counter}
        graph={graph}
        blindingData={blindingData}
        displayPermalink={displayPermalink}
      >
        <ReviewEditor
          counter={counter}
          graphId={graphId}
          action={reviewAction}
          readOnly={true}
          disabled={true}
          createSelector={createSelector}
          matchingLevel={matchingLevel}
          annotable={annotable}
          displayAnnotations={displayAnnotations}
          displayPermalink={displayPermalink}
        />

        {!!arrayify(reviewAction.comment).length && (
          <section className="selectable-indent">
            <h4 className="annotable-action__sub-title">General Notes</h4>

            <AnnotableReviewerCommentList
              graphId={graphId}
              counter={counter}
              createSelector={createSelector}
              action={reviewAction}
              readOnly={true}
              disabled={true}
              annotable={annotable}
              displayAnnotations={displayAnnotations}
              displayPermalink={displayPermalink}
            />
          </section>
        )}

        {!!arrayify(reviewAction.annotation).length && (
          <section className="selectable-indent">
            <h4 className="annotable-action__sub-title">Contextual Notes</h4>

            <ActionAnnotationPreviewList
              user={user}
              journalId={journalId}
              search={search}
              action={reviewAction}
              graphId={getId(graph)}
              counter={counter}
              readOnly={true}
              disabled={true}
              displayAnnotations={displayAnnotations}
              createSelector={createSelector}
              displayPermalink={displayPermalink}
            />
          </section>
        )}
      </Attachment>
    );
  }
}

function makeSelector() {
  return createSelector(
    state => state.user,
    (state, props) => props.acl,
    (state, props) => props.reviewActionId,
    createActionMapSelector(),
    (user, acl, reviewActionId, actionMap) => {
      const reviewAction = getWorkflowAction(reviewActionId, {
        actionMap,
        user,
        acl
      });

      // get authorizeActions (needed to assess the future audiences)
      let authorizeActions, reviewActionStageIndex, reviewActionActionIndex;

      if (reviewAction) {
        const stage = actionMap[getStageId(reviewAction)];
        if (stage) {
          const stageActions = getStageActions(stage);
          authorizeActions = flatten(
            stageActions.map(action =>
              arrayify(action.potentialAction).filter(
                action =>
                  action['@type'] === 'AuthorizeAction' &&
                  action.actionStatus !== 'CompletedActionStatus' &&
                  getObjectId(action) === reviewActionId
              )
            )
          )
            .filter(Boolean)
            .map(action => actionMap[getId(action)] || action);
        }

        const { stageIndex, actionIndex } = getAnnotableQueryParameters(
          {
            actionId: getId(reviewAction),
            stageId: getStageId(reviewAction)
          },
          actionMap
        );
        reviewActionStageIndex = stageIndex;
        reviewActionActionIndex = actionIndex;
      }

      return {
        reviewAction,
        reviewActionAuthorizeActions: authorizeActions,
        reviewActionStageIndex,
        reviewActionActionIndex
      };
    }
  );
}

function makeMapStateToProps() {
  const s = makeSelector();
  return (state, props) => {
    return s(state, props);
  };
}

export default connect(makeMapStateToProps)(ReviewAttachment);
