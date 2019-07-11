import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { unprefix } from '@scipe/jsonld';
import EditableResource from './editable-resource';
import Counter from '../utils/counter';

export default class ArticleBodyFigure extends Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string.isRequired, // the CreateReleaseAction or TypesettingAction @id providing the resource

    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    content: PropTypes.object,
    nodeMap: PropTypes.object,
    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,
    blindingData: PropTypes.object.isRequired
  };

  render() {
    const {
      graphId,
      actionId,
      content,
      nodeMap,
      readOnly,
      disabled,
      counter,
      createSelector,
      matchingLevel,
      annotable,
      displayAnnotations,
      displayPermalink,
      blindingData
    } = this.props;

    const figureResourceId = content.$node.getAttribute('resource');
    if (!figureResourceId) return null;
    const figureResourceType = unprefix(content.$node.getAttribute('typeof'));
    if (!figureResourceType) return null;

    return (
      <EditableResource
        className="article-body-figure"
        graphId={graphId}
        actionId={actionId}
        nodeMap={nodeMap}
        embedded={true}
        counter={counter.increment({
          level: 4,
          value: content.annotableIndex,
          key: `article-body-figure-${figureResourceId}-${graphId}` /* we need graphId as user can toggle versions */
        })}
        createSelector={createSelector}
        matchingLevel={matchingLevel}
        resourceId={figureResourceId}
        readOnly={readOnly}
        disabled={disabled}
        annotable={annotable}
        displayAnnotations={displayAnnotations}
        displayPermalink={displayPermalink}
        blindingData={blindingData}
      />
    );
  }
}
