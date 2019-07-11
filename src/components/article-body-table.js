import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getId } from '@scipe/jsonld';
import Annotable from './annotable';
import TableObject from './table-object';
import Counter from '../utils/counter';

export default class ArticleBodyTable extends Component {
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
    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,
    blindingData: PropTypes.object.isRequired
  };

  constructor(props) {
    super(props);

    this.cache = {};
  }

  getTableObjectContent() {
    // used to prevent re-render of <TableObject />
    const { content } = this.props;

    if (content.id in this.cache) {
      return this.cache[content.id];
    }

    this.cache[content.id] = { html: content.$node.outerHTML };
    return this.cache[content.id];
  }

  render() {
    const {
      graphId,
      content,
      resource,
      annotable,
      counter,
      createSelector,
      matchingLevel,
      displayAnnotations,
      displayPermalink
    } = this.props;

    return (
      <div className="article-body-table">
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
            `article-body-table-${content.id}-${graphId}` /* we need graphId as user can toggle versions */
          )}
          matchingLevel={matchingLevel}
          counter={counter.increment({
            level: 4,
            key: `article-body-table-${content.id}-${graphId}` /* we need graphId as user can toggle versions */,
            value: content.annotableIndex
          })}
          selectable={false}
          annotable={annotable}
          displayAnnotations={displayAnnotations}
          displayPermalink={displayPermalink}
        >
          <TableObject id={content.id} content={this.getTableObjectContent()} />
        </Annotable>
      </div>
    );
  }
}
