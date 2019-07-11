import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getId } from '@scipe/jsonld';
import Annotable from './annotable';
import { Value } from '@scipe/ui';
import Counter from '../utils/counter';

export default class ArticleBodyElement extends Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,

    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    resource: PropTypes.object,
    nodeMap: PropTypes.object,
    content: PropTypes.object,
    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    annotable: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,
    blindingData: PropTypes.object.isRequired
  };

  render() {
    const {
      graphId,
      resource,
      counter,
      createSelector,
      matchingLevel,
      content,
      annotable,
      displayAnnotations,
      displayPermalink
    } = this.props;

    return (
      <div className="article-body-element">
        <Annotable
          graphId={graphId}
          selector={createSelector(
            {
              '@type': 'NodeSelector',
              graph: graphId,
              node: getId(resource),
              selectedProperty: 'encoding',
              hasSubSelector: {
                '@type': 'HtmlSelector',
                graph: graphId,
                htmlId: content.id
              }
            },
            `article-body-element-${content.id}-${graphId}` /* we need graphId as user can toggle versions */
          )}
          matchingLevel={matchingLevel}
          counter={counter.increment({
            level: 4,
            key: `article-body-element-${content.id}-${graphId}` /* we need graphId as user can toggle versions */,
            value: content.annotableIndex
          })}
          annotable={annotable}
          displayAnnotations={displayAnnotations}
          displayPermalink={displayPermalink}
        >
          <Value id={content.id} escHtml={false}>
            {content.$node.outerHTML ||
              content.$node.innerHTML ||
              content.$node.textContent}
          </Value>
        </Annotable>
      </div>
    );
  }
}
