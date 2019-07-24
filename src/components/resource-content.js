import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import identity from 'lodash/identity';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId, embed } from '@scipe/jsonld';
import { schema, getStageId, getStageActions } from '@scipe/librarian';
import Image from './image';
import Table from './table';
import Dataset from './dataset';
import Video from './video';
import Audio from './audio';
import SoftwareSourceCode from './software-source-code';
import Formula from './formula';
import ScholarlyArticle from './scholarly-article';
import TextBox from './text-box';
import CreativeWork from './creative-work';
import AnnotableEncoding from './annotable-encoding';
import Counter from '../utils/counter';
import {
  createGraphAclSelector,
  createActionMapSelector,
  createGraphDataSelector
} from '../selectors/graph-selectors';
import { getWorkflowAction, getInstance } from '../utils/workflow';
import Loading from './loading';

/**
 * Note: this is what is used in the <Shell />
 */
class ResourceContent extends React.PureComponent {
  static propTypes = {
    className: PropTypes.string,
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string, // the `CreateReleaseAction` or `TypesettingAction` or `PublishAction` @id providing the resource (required if `shellified` is not true)
    resourceId: PropTypes.string,
    canPerform: PropTypes.bool, // can the user perform `action`. Must be set if `action` is a CreateReleaseAction
    forceEnableUpdateMainEntityEncoding: PropTypes.bool, // for `TypesettingAction` we only allow to update the main entity encoding (not the parts) => we set `disabled` to `true` this props allows to overwrite that

    nodeMap: PropTypes.object,
    blindingData: PropTypes.object.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,

    embedded: PropTypes.bool,
    shellified: PropTypes.bool,
    renderContent: PropTypes.bool,

    createSelector: PropTypes.func,
    matchingLevel: PropTypes.number,

    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool,
    displayPermalink: PropTypes.bool,

    // redux
    action: PropTypes.object,
    resource: PropTypes.object, // hydrated
    hasUploadAction: PropTypes.object,
    hasPendingServiceActions: PropTypes.bool
  };

  static defaultProps = {
    createSelector: identity,
    action: {}
  };

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true
    };
  }

  componentDidMount() {
    this._isMounted = true;
    this.deferContentRendering();
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      this.props.graphId !== prevProps.graphId ||
      this.props.resourceId !== prevProps.resourceId ||
      this.props.nodeMap !== prevProps.nodeMap
    ) {
      this.deferContentRendering();
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    cancelAnimationFrame(this.animId);
  }

  deferContentRendering() {
    // We defer the content rendering to avoid blocking the UI
    clearTimeout(this.timeoutId);
    this.setState({ isLoading: true }, () => {
      // wait for 2 animation frames before rendering
      this.animId = requestAnimationFrame(() => {
        this.animId = requestAnimationFrame(() => {
          if (this._isMounted) {
            this.setState({ isLoading: false });
          }
        });
      });
    });
  }

  //  For debugging
  //  shouldComponentUpdate(nextProps, nextState) {
  //    console.log(
  //      Object.keys(this.props).filter(key => this.props[key] !== nextProps[key])
  //    );
  //    return true;
  //  }

  renderBody() {
    const {
      resourceId,
      resource,
      action: { releaseRequirement }
    } = this.props;

    // string can happen during document worker reconciliation
    if (!resourceId || !resource) return null;

    let body;
    if (schema.is(resource['@type'], 'Image')) {
      body = <Image {...this.props} releaseRequirement={releaseRequirement} />;
    } else if (schema.is(resource['@type'], 'Audio')) {
      body = <Audio {...this.props} releaseRequirement={releaseRequirement} />;
    } else if (schema.is(resource['@type'], 'Video')) {
      body = <Video {...this.props} releaseRequirement={releaseRequirement} />;
    } else if (schema.is(resource['@type'], 'Table')) {
      body = <Table {...this.props} releaseRequirement={releaseRequirement} />;
    } else if (schema.is(resource['@type'], 'Article')) {
      body = (
        <ScholarlyArticle
          {...this.props}
          releaseRequirement={releaseRequirement}
        />
      );
    } else if (schema.is(resource['@type'], 'SoftwareSourceCode')) {
      body = (
        <SoftwareSourceCode
          {...this.props}
          releaseRequirement={releaseRequirement}
        />
      );
    } else if (schema.is(resource['@type'], 'Formula')) {
      body = (
        <Formula {...this.props} releaseRequirement={releaseRequirement} />
      );
    } else if (schema.is(resource['@type'], 'Dataset')) {
      body = (
        <Dataset {...this.props} releaseRequirement={releaseRequirement} />
      );
    } else if (schema.is(resource['@type'], 'TextBox')) {
      body = (
        <TextBox {...this.props} releaseRequirement={releaseRequirement} />
      );
    } else {
      body = (
        <CreativeWork {...this.props} releaseRequirement={releaseRequirement} />
      );
    }
    return body;
  }

  render() {
    const {
      graphId,
      resource,
      className,
      action,
      shellified,
      hasPendingServiceActions,
      hasUploadAction,
      readOnly,
      disabled,
      canPerform,
      forceEnableUpdateMainEntityEncoding,
      annotable,
      counter,
      displayAnnotations,
      displayPermalink,
      createSelector,
      matchingLevel
    } = this.props;

    const { isLoading } = this.state;

    return (
      <div className={classNames('resource-content', className)}>
        {!shellified && (
          <AnnotableEncoding
            graphId={graphId}
            action={action}
            resource={resource}
            counter={counter}
            createSelector={createSelector}
            matchingLevel={matchingLevel}
            readOnly={readOnly}
            disabled={disabled}
            canPerform={canPerform}
            forceEnableUpdateMainEntityEncoding={
              forceEnableUpdateMainEntityEncoding
            }
            annotable={annotable}
            displayAnnotations={displayAnnotations}
            displayPermalink={displayPermalink}
          />
        )}

        {/* if the action (typically the last CreateReleaseAction) is completed
                    the pending service action are irrelevant as we are displaying old
                    content already settled */}
        {(hasPendingServiceActions ||
          (!hasUploadAction && action['@type'] !== 'CreateReleaseAction')) &&
        action['@type'] !== 'PublishAction' &&
        (action.actionStatus === 'ActiveActionStatus' ||
          action.actionStatus === 'StagedActionStatus') ? null : isLoading ? (
          <Loading />
        ) : (
          this.renderBody()
        )}
      </div>
    );
  }
}

function makeSelector() {
  const resourceSelector = createSelector(
    (state, props) => props.resourceId,
    (state, props) => props.nodeMap,
    createGraphDataSelector(),
    (resourceId, nodeMap, graphData = {}) => {
      nodeMap = nodeMap || graphData.nodeMap || {};

      const node = nodeMap[getId(resourceId)];
      const hydrated = embed(node, nodeMap, {
        keys: [
          'encoding',
          'distribution',
          'detailedDescription',
          'license',
          'author',
          'contributor',
          'creator',
          'editor',
          'reviewer',
          'producer',
          'about',
          'funder',
          'sponsor',
          'citation',
          'copyrightHolder',
          'encodesCreativeWork',
          'exampleOfWork',
          'isBasedOn'
        ].concat(
          schema.is(node['@type'], 'Image')
            ? ['hasPart'] // multi part figures
            : []
        ),
        blacklist: [
          'resourceOf',
          'isNodeOf',
          'potentialAction',
          'isPartOf',
          'mainEntity'
        ]
      });

      return hydrated;
    }
  );

  return createSelector(
    state => state.user,
    createGraphAclSelector(),
    (state, props) => props.actionId,
    createActionMapSelector(),
    resourceSelector,
    (user, acl, actionId, actionMap, resource) => {
      let action, hasPendingServiceActions, hasUploadAction;

      if (actionId) {
        action = getWorkflowAction(actionId, { actionMap, user, acl });

        hasUploadAction = Object.values(actionMap).find(
          action =>
            action['@type'] === 'UploadAction' &&
            action.actionStatus === 'CompletedActionStatus' &&
            getId(action.instrumentOf) === actionId
        );

        if (action) {
          const stageActions = getStageActions(
            actionMap[getStageId(action)]
          ).map(stageAction =>
            getInstance(stageAction, { actionMap, user, acl })
          );

          const serviceActions = stageActions.filter(stageAction =>
            getId(stageAction.serviceOutputOf)
          );

          hasPendingServiceActions = serviceActions.some(serviceAction => {
            return (
              getId(serviceAction) !== getId(action) &&
              serviceAction.actionStatus !== 'CompletedActionStatus' &&
              serviceAction.actionStatus !== 'FailedActionStatus' &&
              serviceAction.actionStatus !== 'CanceledActionStatus'
            );
          });
        }
      }

      return {
        acl,
        action,
        hasUploadAction,
        hasPendingServiceActions,
        resource
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

export default connect(makeMapStateToProps)(ResourceContent);
