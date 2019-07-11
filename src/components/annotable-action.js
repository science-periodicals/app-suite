import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Helmet } from 'react-helmet-async';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { textify, getId } from '@scipe/jsonld';
import AnnotablePublishAction from './annotable-publish-action';
import AnnotableDeclareAction from './annotable-declare-action';
import AnnotableReviewAction from './annotable-review-action';
import AnnotableAssessAction from './annotable-assess-action';
import AnnotablePayAction from './annotable-pay-action';
import AnnotableCreateReleaseAction from './annotable-create-release-action';
import AnnotableTypesettingAction from './annotable-typesetting-action';
import Counter from '../utils/counter';
import StagingDiscussion from './staging-discussion';
import StagingDiscussionWrapper from './staging-discussion-wrapper';
import { locationAutocompleteDataSelector } from '../selectors/graph-selectors';

// TODO? render FilesAttachment here so that it is not unmounted in action route transition => will make navigation way faster

class AnnotableAction extends Component {
  static propTypes = {
    user: PropTypes.object.isRequired,
    journalId: PropTypes.string.isRequired,
    graphId: PropTypes.string.isRequired,
    stageId: PropTypes.string,
    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool.isRequired,
    displayedVersion: PropTypes.string,

    counter: PropTypes.instanceOf(Counter).isRequired,

    stage: PropTypes.object.isRequired,
    action: PropTypes.object.isRequired,
    nComments: PropTypes.number,
    endorseAction: PropTypes.object,
    serviceActions: PropTypes.arrayOf(PropTypes.object),
    blockingActions: PropTypes.array,
    authorizeActions: PropTypes.array,
    completeImpliesSubmit: PropTypes.bool.isRequired,
    isBlocked: PropTypes.bool.isRequired,
    isReadyToBeSubmitted: PropTypes.bool.isRequired,
    canView: PropTypes.bool.isRequired,
    canAssign: PropTypes.bool.isRequired,
    canAssignEndorseAction: PropTypes.bool,
    canComment: PropTypes.bool.isRequired,
    canReschedule: PropTypes.bool.isRequired,
    canPerform: PropTypes.bool.isRequired,
    canEndorse: PropTypes.bool.isRequired,
    canViewEndorse: PropTypes.bool.isRequired,
    canCancel: PropTypes.bool,

    annotable: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    graph: PropTypes.object.isRequired,
    acl: PropTypes.object.isRequired,

    blindingData: PropTypes.object.isRequired,
    saveWorkflowAction: PropTypes.func.isRequired,
    postWorkflowAction: PropTypes.func.isRequired,

    // redux
    // for suggestion autocomplete
    locationOptions: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
        description: PropTypes.string,
        children: PropTypes.array,
        disabled: PropTypes.bool // if `disabled` is true we can't select that item
      })
    )
  };

  static defaultProps = {
    serviceActions: [],
    blockingActions: []
  };

  constructor(props) {
    super(props);
    this.selectorCreatorCache = {};
    this.selectorCache = {};
  }

  // Note: this memoize both the `selectorCreator` function and the return value
  // of `selectorCreator`
  memoizeCreateSelector = (
    selectorCreator, // for convenience this can be a selector, in which case we simply memoize the selector
    selectorCreatorKey
  ) => {
    if (
      selectorCreatorKey != null &&
      selectorCreatorKey in this.selectorCreatorCache
    ) {
      return this.selectorCreatorCache[selectorCreatorKey];
    }

    if (typeof selectorCreator === 'function') {
      const memoizedSelectorCreator = (subSelector, key) => {
        if (key != null && key in this.selectorCache) {
          return this.selectorCache[key];
        }

        const value = selectorCreator(subSelector);
        if (key != null) {
          this.selectorCache[key] = value;
          return this.selectorCache[key];
        }

        return value;
      };

      if (selectorCreatorKey != null) {
        this.selectorCreatorCache[selectorCreatorKey] = memoizedSelectorCreator;
        return this.selectorCreatorCache[selectorCreatorKey];
      }

      return memoizedSelectorCreator;
    } else {
      // `selectorCreator` is a selector (object)
      const selector = selectorCreator;
      if (selectorCreatorKey != null) {
        this.selectorCreatorCache[selectorCreatorKey] = selector;
        return this.selectorCreatorCache[selectorCreatorKey];
      }

      return selector;
    }
  };

  componentDidMount() {
    window.scrollTo(0, 0);
  }

  renderHandler() {
    const {
      action,
      counter,
      readOnly: _readOnly,
      annotable: _annotable,
      blindingData,
      graphId,
      journalId,
      disabled,
      canComment,
      nComments
    } = this.props;
    const readOnly =
      _readOnly || action.actionStatus === 'CompletedActionStatus';
    const annotable =
      _annotable ||
      (action.actionStatus === 'ActiveActionStatus' ||
        action.actionStatus === 'StagedActionStatus');

    const [stageIndex, actionIndex] = action.identifier.split('.');
    const children =
      nComments || canComment ? (
        <StagingDiscussionWrapper>
          <StagingDiscussion
            journalId={journalId}
            graphId={graphId}
            actionId={getId(action)}
            counter={counter}
            blindingData={blindingData}
            disabled={disabled}
            readOnly={readOnly}
            search={`?stage=${stageIndex}&action=${actionIndex}`}
          />
        </StagingDiscussionWrapper>
      ) : null;

    switch (action['@type']) {
      case 'TypesettingAction':
        return (
          <AnnotableTypesettingAction
            {...this.props}
            readOnly={readOnly}
            annotable={annotable}
            memoizeCreateSelector={this.memoizeCreateSelector}
          >
            {children}
          </AnnotableTypesettingAction>
        );

      case 'CreateReleaseAction': {
        return (
          <AnnotableCreateReleaseAction
            {...this.props}
            readOnly={readOnly}
            annotable={annotable}
            memoizeCreateSelector={this.memoizeCreateSelector}
          >
            {children}
          </AnnotableCreateReleaseAction>
        );
      }

      case 'PublishAction': {
        return (
          <AnnotablePublishAction
            {...this.props}
            readOnly={readOnly}
            annotable={annotable}
            memoizeCreateSelector={this.memoizeCreateSelector}
          >
            {children}
          </AnnotablePublishAction>
        );
      }

      case 'ReviewAction':
        return (
          <AnnotableReviewAction
            {...this.props}
            readOnly={readOnly}
            annotable={annotable}
            memoizeCreateSelector={this.memoizeCreateSelector}
          >
            {children}
          </AnnotableReviewAction>
        );

      case 'DeclareAction':
        return (
          <AnnotableDeclareAction
            {...this.props}
            readOnly={readOnly}
            annotable={annotable}
            memoizeCreateSelector={this.memoizeCreateSelector}
          >
            {children}
          </AnnotableDeclareAction>
        );

      case 'AssessAction':
        return (
          <AnnotableAssessAction
            {...this.props}
            readOnly={readOnly}
            annotable={annotable}
            memoizeCreateSelector={this.memoizeCreateSelector}
          >
            {children}
          </AnnotableAssessAction>
        );

      case 'PayAction':
        return (
          <AnnotablePayAction
            {...this.props}
            readOnly={readOnly}
            annotable={annotable}
            memoizeCreateSelector={this.memoizeCreateSelector}
          >
            {children}
          </AnnotablePayAction>
        );

      default:
        return null;
    }
  }

  render() {
    const { action } = this.props;

    return (
      <div className="annotable-action">
        {action.name && (
          <Helmet>
            <title>sci.pe • submission • {textify(action.name)}</title>
          </Helmet>
        )}
        {this.renderHandler()}
      </div>
    );
  }
}

export default connect(
  createSelector(
    locationAutocompleteDataSelector,
    locationOptions => {
      return { locationOptions };
    }
  )
)(AnnotableAction);

export const StyleCardBody = props => {
  const { id, children, tagName, className } = props;

  const El = tagName || 'div';
  return (
    <El
      id={id}
      className={classNames('annotable-action__card-body', className)}
      data-testid={props['data-testid']}
    >
      {children}
    </El>
  );
};

StyleCardBody.propTypes = {
  'data-testid': PropTypes.string,
  id: PropTypes.string,
  children: PropTypes.any,
  tagName: PropTypes.string,
  className: PropTypes.string
};
