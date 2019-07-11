import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { unprefix } from '@scipe/jsonld';
import ArticleBodyElement from './article-body-element';
import EditableResource from './editable-resource';
import Counter from '../utils/counter';

export default class ArticleBodyAside extends Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string.isRequired, // the CreateReleaseAction or TypesettingAction @id providing the resource

    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    resource: PropTypes.object.isRequired,
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
      content,
      nodeMap,
      graphId,
      actionId,
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

    const asideResourceId = content.$node.getAttribute('resource');
    if (!asideResourceId) return null;
    const asideResourceType = unprefix(content.$node.getAttribute('typeof'));

    if (asideResourceId && asideResourceType === 'TextBox') {
      return (
        <EditableResource
          className="article-body-aside"
          graphId={graphId}
          actionId={actionId}
          nodeMap={nodeMap}
          counter={counter.increment({
            level: 4,
            value: content.annotableIndex,
            key: `article-body-aside-${asideResourceId}-${graphId}` /* we need graphId as user can toggle versions */
          })}
          createSelector={createSelector}
          matchingLevel={matchingLevel}
          embedded={true}
          resourceId={asideResourceId}
          readOnly={readOnly}
          disabled={disabled}
          annotable={annotable}
          displayAnnotations={displayAnnotations}
          displayPermalink={displayPermalink}
          blindingData={blindingData}
        />
      );
    } else {
      return <ArticleBodyElement {...this.props} />;
    }
  }
}
