import React, { Component } from 'react';
import PropTypes from 'prop-types';
import identity from 'lodash/identity';
import { getId } from '@scipe/jsonld';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getDataDownloadDisplayEncodings } from '../utils/data-download';
import DataDownload from './data-download';
import TableObject from './table-object';
import Annotable from './annotable';
import Caption from './caption';
import Counter from '../utils/counter';

class Dataset extends Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string, // the CreateReleaseAction or TypesettingAction @id providing the resource (required when editable)
    resource: PropTypes.object.isRequired,
    nodeMap: PropTypes.object,
    embedded: PropTypes.bool,
    blindingData: PropTypes.object.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func,
    matchingLevel: PropTypes.number,

    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,
    //redux
    content: PropTypes.object
  };

  static defaultProps = {
    createSelector: identity
  };

  renderHtml() {
    const {
      resource,
      graphId,
      content,
      annotable,
      counter,
      displayAnnotations,
      displayPermalink,
      createSelector,
      matchingLevel
    } = this.props;

    return (
      <Annotable
        graphId={graphId}
        selector={createSelector(
          {
            '@type': 'NodeSelector',
            graph: graphId,
            node: getId(resource),
            selectedProperty: 'distribution'
          },
          `dataset-${getId(
            resource
          )}-${graphId}` /* we need graphId as user can toggle versions */
        )}
        matchingLevel={matchingLevel}
        counter={counter.increment({
          level: 5,
          key: `dataset-${getId(
            resource
          )}-${graphId}` /* we need graphId as user can toggle versions */
        })}
        selectable={false}
        annotable={annotable}
        displayAnnotations={displayAnnotations}
        displayPermalink={displayPermalink}
      >
        <TableObject content={content} />
      </Annotable>
    );
  }

  renderDistribution() {
    const {
      graphId,
      resource,
      annotable,
      counter,
      displayAnnotations,
      displayPermalink,
      createSelector,
      matchingLevel
    } = this.props;

    const displayEncodings = getDataDownloadDisplayEncodings(resource);
    if (!displayEncodings.length) {
      return null;
    }

    return (
      <Annotable
        className="dataset__distribution"
        graphId={graphId}
        selector={createSelector(
          {
            '@type': 'NodeSelector',
            graph: graphId,
            node: getId(resource),
            selectedProperty: 'distribution'
          },
          `dataset-${getId(
            resource
          )}-${graphId}` /* we need graphId as user can toggle versions */
        )}
        matchingLevel={matchingLevel}
        counter={counter.increment({
          level: 5,
          key: `dataset-${getId(
            resource
          )}-${graphId}` /* we need graphId as user can toggle versions */
        })}
        selectable={false}
        annotable={annotable}
        displayAnnotations={displayAnnotations}
        displayPermalink={displayPermalink}
      >
        <DataDownload resource={resource} />
      </Annotable>
    );
  }

  renderWorkbook() {
    const {
      graphId,
      resource,
      content,
      counter,
      annotable,
      displayAnnotations,
      displayPermalink,
      createSelector,
      matchingLevel
    } = this.props;

    return (
      <Annotable
        graphId={graphId}
        selector={createSelector(
          {
            '@type': 'NodeSelector',
            graph: graphId,
            node: getId(resource),
            selectedProperty: 'distribution'
          },
          `dataset-${getId(
            resource
          )}-${graphId}` /* we need graphId as user can toggle versions */
        )}
        matchingLevel={matchingLevel}
        counter={counter.increment({
          level: 5,
          key: `dataset-${getId(
            resource
          )}-${graphId}` /* we need graphId as user can toggle versions */
        })}
        selectable={false}
        annotable={annotable}
        displayAnnotations={displayAnnotations}
        displayPermalink={displayPermalink}
      >
        <ul className="dataset__list">
          {content.workbook.map((sheet, i) => (
            <li className="dataset__list-item" key={sheet.name}>
              <header className="dataset__header">
                <h5 className="dataset__sheet-name">{sheet.name}</h5>
              </header>

              <TableObject content={sheet} />
            </li>
          ))}
        </ul>
      </Annotable>
    );
  }

  render() {
    const {
      resource,
      graphId,
      actionId,
      nodeMap,
      content,
      counter,
      createSelector,
      matchingLevel,
      embedded,
      readOnly,
      disabled,
      annotable,
      displayAnnotations,
      displayPermalink,
      blindingData
    } = this.props;

    return (
      <figure className="dataset">
        {content
          ? content.workbook
            ? this.renderWorkbook()
            : this.renderHtml()
          : this.renderDistribution()}

        <figcaption>
          <Caption
            graphId={graphId}
            actionId={actionId}
            nodeMap={nodeMap}
            resource={resource}
            createSelector={createSelector}
            matchingLevel={matchingLevel}
            counter={counter}
            embedded={embedded}
            readOnly={readOnly}
            disabled={disabled}
            annotable={annotable}
            displayAnnotations={displayAnnotations}
            displayPermalink={displayPermalink}
            blindingData={blindingData}
          />
        </figcaption>
      </figure>
    );
  }
}

function makeSelector() {
  return createSelector(
    (state, props) => {
      if (
        props.resource &&
        (props.resource.encoding || props.resource.distribution)
      ) {
        const encodings =
          props.resource.encoding || props.resource.distribution;
        for (let encoding of encodings) {
          const encodingId = getId(encoding);
          if (
            encodingId in state.contentMap &&
            (state.contentMap[encodingId].html ||
              state.contentMap[encodingId].workbook)
          ) {
            return state.contentMap[encodingId];
          }
        }
      }
    },
    content => {
      return { content };
    }
  );
}

function makeMapStateToProps() {
  const s = makeSelector();
  return (state, props) => {
    return s(state, props);
  };
}

export default connect(makeMapStateToProps)(Dataset);
