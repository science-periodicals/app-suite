import React from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';
import { connect } from 'react-redux';
import identity from 'lodash/identity';
import flatten from 'lodash/flatten';
import { getId, unprefix, arrayify } from '@scipe/jsonld';
import {
  getScopeId,
  getObjectId,
  getStageId,
  getStageActions,
  getLocationIdentifier
} from '@scipe/librarian';
import Counter from '../utils/counter';
import { createActionMapSelector } from '../selectors/graph-selectors';
import { getAnnotableQueryParameters } from '../utils/annotations';
import AssessmentEditor from './assessment-editor';
import Attachment from './attachment';
import AnnotableRevisionRequestCommentList from './annotable-revision-request-comment-list';
import ActionAnnotationPreviewList from './action-annotation-preview-list';

class AssessmentAttachment extends React.PureComponent {
  static propTypes = {
    user: PropTypes.object.isRequired,
    graph: PropTypes.object.isRequired,
    journalId: PropTypes.string.isRequired,
    graphId: PropTypes.string.isRequired,
    search: PropTypes.string.isRequired, // the search value of the parent counter
    action: PropTypes.shape({
      '@type': PropTypes.oneOf(['AssessAction']).isRequired
    }).isRequired, // assess action

    createSelector: PropTypes.func,
    matchingLevel: PropTypes.number,

    acl: PropTypes.object.isRequired,
    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,

    annotable: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,
    displayAnnotations: PropTypes.bool.isRequired,
    blindingData: PropTypes.object.isRequired,
    reviewAttachmentLinkType: PropTypes.oneOf(['shell', 'transition']),

    // redux
    assessActionStageIndex: PropTypes.number,
    assessActionActionIndex: PropTypes.number,
    assessActionAuthorizeActions: PropTypes.arrayOf(PropTypes.object)
  };

  static defaultProps = {
    action: {},
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
      action,
      assessActionStageIndex,
      assessActionActionIndex
    } = this.props;

    const key = `${getId(graph)}-${getId(
      action
    )}-${assessActionStageIndex}-${assessActionActionIndex}`;
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
        assessActionStageIndex,
        assessActionActionIndex,
        getLocationIdentifier(action['@type']),
        0
      ]
    });

    this.counterCache[key] = counter;

    return this.counterCache[key];
  }

  render() {
    const {
      user,
      journalId,
      graphId,
      graph,
      blindingData,
      action,
      assessActionAuthorizeActions,
      matchingLevel,
      createSelector,
      annotable,
      displayPermalink,
      displayAnnotations,
      acl,
      reviewAttachmentLinkType
    } = this.props;

    const counter = this.createCounter();

    return (
      <Attachment
        id={action.identifier}
        data-testid="assessment-attachment"
        className="review-attachment"
        user={user}
        acl={acl}
        title="Assessment"
        action={action}
        authorizeActions={assessActionAuthorizeActions}
        counter={counter}
        graph={graph}
        blindingData={blindingData}
      >
        <AssessmentEditor
          journalId={journalId}
          graph={graph}
          graphId={graphId}
          counter={counter}
          action={action}
          readOnly={true}
          disabled={true}
          createSelector={createSelector}
          matchingLevel={matchingLevel}
          annotable={annotable}
          displayPermalink={displayPermalink}
          displayAnnotations={displayAnnotations}
          blindingData={blindingData}
        />

        {!!arrayify(action.comment).length && (
          <section className="selectable-indent">
            <h4 className="annotable-action__sub-title">
              General revision requests
            </h4>

            <AnnotableRevisionRequestCommentList
              graphId={graphId}
              counter={counter}
              createSelector={createSelector}
              action={action}
              readOnly={true}
              disabled={true}
              annotable={annotable}
              displayAnnotations={displayAnnotations}
              displayPermalink={displayPermalink}
              reviewAttachmentLinkType={reviewAttachmentLinkType}
            />
          </section>
        )}

        {!!arrayify(action.annotation).length && (
          <section className="selectable-indent">
            <h4 className="annotable-action__sub-title">
              In context revision requests
            </h4>

            <ActionAnnotationPreviewList
              user={user}
              journalId={journalId}
              search={counter.search}
              action={action}
              graphId={graphId}
              counter={counter}
              createSelector={createSelector}
              displayAnnotations={displayAnnotations}
              displayPermalink={displayPermalink}
              reviewAttachmentLinkType={reviewAttachmentLinkType}
              readOnly={true}
              disabled={true}
            />
          </section>
        )}
      </Attachment>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => props.action,
    createActionMapSelector(),
    (assessAction, actionMap) => {
      const { stageIndex, actionIndex } = getAnnotableQueryParameters(
        {
          actionId: getId(assessAction),
          stageId: getStageId(assessAction)
        },
        actionMap
      );

      let authorizeActions;
      const stage = actionMap[getStageId(assessAction)];
      if (stage) {
        const stageActions = getStageActions(stage);
        authorizeActions = flatten(
          stageActions.map(action =>
            arrayify(action.potentialAction).filter(
              action =>
                action['@type'] === 'AuthorizeAction' &&
                action.actionStatus !== 'CompletedActionStatus' &&
                getObjectId(action) === getId(assessAction)
            )
          )
        )
          .filter(Boolean)
          .map(action => actionMap[getId(action)] || action);
      }

      return {
        assessActionAuthorizeActions: authorizeActions,
        assessActionStageIndex: stageIndex,
        assessActionActionIndex: actionIndex
      };
    }
  )
)(AssessmentAttachment);
