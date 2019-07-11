import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getId } from '@scipe/jsonld';
import Annotable from './annotable';
import { Value } from '@scipe/ui';
import Counter from '../utils/counter';

export default class ArticleBodyList extends Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,

    resource: PropTypes.object.isRequired,
    content: PropTypes.object,
    nodeMap: PropTypes.object,

    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool,
    displayPermalink: PropTypes.bool,

    blindingData: PropTypes.object.isRequired
  };

  render() {
    const {
      content,
      resource,
      graphId,
      counter,
      createSelector,
      matchingLevel,
      annotable,
      displayAnnotations,
      displayPermalink
    } = this.props;

    return React.createElement(
      content.$node.tagName.toLowerCase(),
      { className: 'article-body-list' },
      content.children.map(child => {
        return (
          <li key={child.id}>
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
                `article-body-list-${child.id}-${graphId}` /* we need graphId as user can toggle versions */
              )}
              matchingLevel={matchingLevel}
              counter={counter.increment({
                level: 4,
                key: `article-body-list-${child.id}-${graphId}` /* we need graphId as user can toggle versions */,
                value: content.annotableIndex
              })}
              annotable={annotable}
              displayAnnotations={displayAnnotations}
              displayPermalink={displayPermalink}
            >
              <div>
                <div id={child.id} className="article-body-list__refNum" />
                <Value escHtml={false}>{child.$node.innerHTML}</Value>
              </div>
            </Annotable>
          </li>
        );
      })
    );
  }
}
