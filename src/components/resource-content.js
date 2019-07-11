import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import identity from 'lodash/identity';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId } from '@scipe/jsonld';
import { schema, getStageId, getStageActions } from '@scipe/librarian';
import Image from './image';
import Node from './node';
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
  createActionMapSelector
} from '../selectors/graph-selectors';
import { getWorkflowAction, getInstance } from '../utils/workflow';

// TODO move AnnotableEncoding directly in the Resource so that it can be right below the content for everything but the article...

/**
 * Note: this is what is used in the <Shell />
 */
class ResourceContent extends React.PureComponent {
  static propTypes = {
    className: PropTypes.string,
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string, // the `CreateReleaseAction` or `TypesettingAction` or `PublishAction` @id providing the resource (required if `shellified` is not true)
    resource: PropTypes.object,
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
    hasUploadAction: PropTypes.object,
    hasPendingServiceActions: PropTypes.bool
  };

  static defaultProps = {
    createSelector: identity,
    resource: {},
    action: {}
  };

  renderBody(resource, counter) {
    const {
      action: { releaseRequirement }
    } = this.props;

    // string can happen during document worker reconciliation
    if (!resource || typeof resource === 'string') return null;

    let body;
    if (schema.is(resource['@type'], 'Image')) {
      body = (
        <Image
          {...this.props}
          resource={resource}
          counter={counter}
          releaseRequirement={releaseRequirement}
        />
      );
    } else if (schema.is(resource['@type'], 'Audio')) {
      body = (
        <Audio
          {...this.props}
          resource={resource}
          counter={counter}
          releaseRequirement={releaseRequirement}
        />
      );
    } else if (schema.is(resource['@type'], 'Video')) {
      body = (
        <Video
          {...this.props}
          resource={resource}
          counter={counter}
          releaseRequirement={releaseRequirement}
        />
      );
    } else if (schema.is(resource['@type'], 'Table')) {
      body = (
        <Table
          {...this.props}
          resource={resource}
          counter={counter}
          releaseRequirement={releaseRequirement}
        />
      );
    } else if (schema.is(resource['@type'], 'Article')) {
      body = (
        <ScholarlyArticle
          {...this.props}
          resource={resource}
          counter={counter}
          releaseRequirement={releaseRequirement}
        />
      );
    } else if (schema.is(resource['@type'], 'SoftwareSourceCode')) {
      body = (
        <SoftwareSourceCode
          {...this.props}
          resource={resource}
          counter={counter}
          releaseRequirement={releaseRequirement}
        />
      );
    } else if (schema.is(resource['@type'], 'Formula')) {
      body = (
        <Formula
          {...this.props}
          resource={resource}
          counter={counter}
          releaseRequirement={releaseRequirement}
        />
      );
    } else if (schema.is(resource['@type'], 'Dataset')) {
      body = (
        <Dataset
          {...this.props}
          resource={resource}
          counter={counter}
          releaseRequirement={releaseRequirement}
        />
      );
    } else if (schema.is(resource['@type'], 'TextBox')) {
      body = (
        <TextBox
          {...this.props}
          resource={resource}
          counter={counter}
          releaseRequirement={releaseRequirement}
        />
      );
    } else {
      body = (
        <CreativeWork
          {...this.props}
          resource={resource}
          counter={counter}
          releaseRequirement={releaseRequirement}
        />
      );
    }
    return body;
  }

  renderHydratedResource = resource => {
    const {
      graphId,
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

    // TODO if is embedded: display the label first like in reader (Annotable on the alternateName) but not a PaperInput (will be edited in the shell editor)
    return (
      <div>
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

        {(hasPendingServiceActions ||
          (!hasUploadAction && action['@type'] !== 'CreateReleaseAction')) &&
        action['@type'] !== 'PublishAction' &&
        (action.actionStatus === 'ActiveActionStatus' ||
          action.actionStatus === 'StagedActionStatus') // if the action (typically the last CreateReleaseAction) is completed the pending service action are irrelevant as we are displaying old content already settled
          ? null
          : this.renderBody(resource, counter)}
      </div>
    );
  };

  render() {
    const { graphId, resource, className, nodeMap } = this.props;

    const embed = ['encoding', 'distribution'].concat(
      schema.is(resource['@type'], 'Image')
        ? ['hasPart'] // multi part figures
        : []
    );

    return (
      <div className={classNames('resource-content', className)}>
        <Node
          graphId={graphId}
          node={resource}
          nodeMap={nodeMap}
          embed={embed}
          omit={[
            'about',
            'potentialAction',
            'creator',
            'author',
            'contributor',
            'producer',
            'editor',
            'license',
            'encodesCreativeWork',
            'exampleOfWork',
            'isBasedOn',
            'isPartOf',
            'funder',
            'sponsor',
            'citation',
            'copyrightHolder',
            'mainEntity'
          ]}
        >
          {this.renderHydratedResource}
        </Node>
      </div>
    );
  }
}

export default connect(
  createSelector(
    state => state.user,
    createGraphAclSelector(),
    (state, props) => props.actionId,
    createActionMapSelector(),
    (user, acl, actionId, actionMap) => {
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
        action,
        hasUploadAction,
        hasPendingServiceActions
      };
    }
  )
)(ResourceContent);
