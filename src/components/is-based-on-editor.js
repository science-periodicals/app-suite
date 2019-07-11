import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelectorCreator, defaultMemoize } from 'reselect';
import { getId, arrayify, getValue, textify } from '@scipe/jsonld';
import isUrl from 'is-url';
import {
  PaperAutocomplete,
  getPotentialDependencies,
  Value,
  getResourceInfo
} from '@scipe/ui';
import { createGraphDataSelector } from '../selectors/graph-selectors';
import Thumbnail from './thumbnail';
import Annotable from './annotable';
import IsBasedOn from './is-based-on';
import { updateGraph } from '../actions/graph-action-creators';
import { highlightResource } from '../actions/ui-action-creators';
import Counter from '../utils/counter';

class IsBasedOnEditor extends PureComponent {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string, // the CreateReleaseAction or TypesettingAction @id providing the resource (required when editable)
    resource: PropTypes.object,
    nodeMap: PropTypes.object,
    counter: PropTypes.instanceOf(Counter).isRequired,

    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,

    annotable: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,

    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    // redux
    resourceMap: PropTypes.object,
    potentialDependencies: PropTypes.arrayOf(PropTypes.object),
    highlightResource: PropTypes.func,
    updateGraph: PropTypes.func
  };

  static defaultProps = {
    resourceMap: {},
    potentialDependencies: []
  };

  constructor(props) {
    super(props);
    this.state = {
      error: null
    };

    this.shouldItemRender = this.shouldItemRender.bind(this);
    this.renderItem = this.renderItem.bind(this);
    this.renderMenu = this.renderMenu.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
  }

  componentWillUnmount() {
    clearTimeout(this.timeoutId);
  }

  handleMouseEnter(depId) {
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      this.props.highlightResource(depId);
    }, 5);
  }

  handleMouseLeave(depId) {
    this.props.highlightResource(null);
  }

  handleChange(e, value) {
    this.setState({
      error:
        value && !this.isAddable(value)
          ? 'enter a valid url, select a resource'
          : null
    });
  }

  handleAdd(id) {
    const { graphId, actionId, resource, updateGraph } = this.props;
    updateGraph(
      graphId,
      actionId,
      {
        '@graph': [
          {
            '@id': getId(resource),
            isBasedOn:
              id == null
                ? []
                : arrayify(resource.isBasedOn)
                    .filter(node => getId(node) !== id)
                    .concat(id)
          }
        ]
      },
      { mergeStrategy: 'ReconcileMergeStrategy' }
    );
    this.autocomplete.resetValue('');
    this.autocomplete.blur();
  }

  handleRemove(id, e) {
    e.preventDefault();
    const { graphId, actionId, resource, updateGraph } = this.props;
    updateGraph(
      graphId,
      actionId,
      {
        '@graph': [
          {
            '@id': getId(resource),
            isBasedOn: arrayify(resource.isBasedOn).filter(
              node => getId(node) !== id
            )
          }
        ]
      },
      { mergeStrategy: 'ReconcileMergeStrategy' }
    );
  }

  getIds(value) {
    // return a list as one value can map to multiple ids
    const { resourceMap } = this.props;
    return Object.keys(resourceMap).filter(key => {
      const resource = resourceMap[key];
      return (
        resource['@id'] === value ||
        getValue(resource.name) === value ||
        getValue(resource.alternateName) === value
      );
    });
  }

  isAddable(value) {
    if (!value) return;

    const { resource, potentialDependencies } = this.props;

    const ids = this.getIds(value);
    if (ids.length !== 1) {
      return isUrl(value) && !~(resource.isBasedOn || []).indexOf(value);
    }

    const id = ids[0];
    const isPotentialDependencies = potentialDependencies.some(
      r => r['@id'] === id
    );

    return (
      (isUrl(id) || isPotentialDependencies) &&
      !~(resource.isBasedOn || []).indexOf(id)
    );
  }

  handleSelect(value, item) {
    const { resource } = this.props;

    if (item) {
      this.handleAdd(item['@id']);
    } else if (this.isAddable(value)) {
      this.handleAdd(this.getIds(value)[0] || value);
    } else if (
      !value &&
      resource.isBasedOn &&
      resource.isBasedOn.length === 1 &&
      /^n\/a$/i.test(resource.isBasedOn[0])
    ) {
      // set to ''
      this.handleAdd(null);
    }
  }

  shouldItemRender(item, value) {
    const name = textify(item.name);
    const alternateName = textify(item.alternateName);
    const description = textify(item.description);

    return (
      (typeof name === 'string' &&
        ~name.toLowerCase().indexOf(value.toLowerCase())) ||
      (typeof alternateName === 'string' &&
        ~alternateName.toLowerCase().indexOf(value.toLowerCase())) ||
      (typeof description === 'string' &&
        ~description.toLowerCase().indexOf(value.toLowerCase()))
    );
  }

  renderItem(item, isHighlighted, style) {
    return (
      <li
        key={item['@id']}
        className={`is-based-on-editor__input-list-item ${
          isHighlighted ? 'highlighted' : ''
        }`}
      >
        <Thumbnail resource={item} fallback="icon" />
        <Value tagName="span">
          {item.alternateName || item.name || item['@id']}
        </Value>
      </li>
    );
  }

  renderMenu(items, value, style) {
    return (
      <ol className="paper-autocomplete__results">
        {items.length ? items : null}
      </ol>
    );
  }

  renderDependencies(counter) {
    const {
      graphId,
      resource,
      resource: { isBasedOn },
      resourceMap,
      readOnly,
      disabled,
      annotable,
      displayAnnotations,
      displayPermalink,
      createSelector,
      matchingLevel
    } = this.props;

    const dependencies = arrayify(isBasedOn);
    if (!dependencies.length) {
      return null;
    }

    return (
      <ul className="is-based-on-editor__list reverse-z-index">
        {dependencies.map((d, index, arr) => {
          const uri = getId(d);
          const dep = resourceMap[uri] || uri;

          return (
            <li
              className="is-based-on-editor__list-item"
              key={uri}
              onMouseEnter={this.handleMouseEnter.bind(this, uri)}
              onMouseLeave={this.handleMouseLeave.bind(this, uri)}
            >
              <Annotable
                graphId={graphId}
                selector={createSelector({
                  '@type': 'NodeSelector',
                  graph: graphId,
                  node: getId(resource),
                  selectedProperty: 'isBasedOn',
                  selectedItem: uri
                })}
                matchingLevel={matchingLevel}
                counter={counter.increment({
                  level: 4,
                  key: `is-based-on-editor-${getId(resource)}-${uri}`
                })}
                annotable={annotable}
                selectable={false}
                displayAnnotations={displayAnnotations}
                displayPermalink={displayPermalink}
              >
                <IsBasedOn
                  graphId={graphId}
                  isBasedOn={dep}
                  readOnly={readOnly}
                  disabled={disabled}
                  onDelete={this.handleRemove}
                />
              </Annotable>
            </li>
          );
        })}
      </ul>
    );
  }

  render() {
    const {
      potentialDependencies,
      resource,
      graphId,
      readOnly,
      disabled,
      annotable,
      counter,
      displayAnnotations,
      displayPermalink,
      createSelector,
      matchingLevel
    } = this.props;

    const incrementedCounter = counter.increment({
      level: 3,
      key: `is-based-on-editor-${getId(resource)}`
    });

    return (
      <div className="is-based-on-editor reverse-z-index">
        {this.renderDependencies(counter)}
        {!readOnly && (
          <Annotable
            graphId={graphId}
            selector={createSelector({
              '@type': 'NodeSelector',
              graph: graphId,
              node: getId(resource),
              selectedProperty: 'isBasedOn'
            })}
            matchingLevel={matchingLevel}
            counter={incrementedCounter}
            annotable={annotable}
            displayAnnotations={displayAnnotations}
            displayPermalink={displayPermalink}
          >
            <PaperAutocomplete
              ref={el => {
                this.autocomplete = el;
              }}
              readOnly={readOnly}
              disabled={disabled}
              items={potentialDependencies}
              initialValue={''}
              getItemValue={item => item.alternateName}
              shouldItemRender={this.shouldItemRender}
              renderItem={this.renderItem}
              renderMenu={this.renderMenu}
              onSelect={this.handleSelect}
              onSubmit={this.handleSelect}
              onChange={this.handleChange}
              submitOnBlur={true}
              allowUnlistedInput={true}
              inputProps={{
                name: 'isBasedOn',
                label: 'Add Requirement',
                error: this.state.error,
                readOnly: readOnly,
                disabled: disabled,
                floatLabel: true
              }}
            />
          </Annotable>
        )}
      </div>
    );
  }
}

const createObjectShallowEqualSelector = createSelectorCreator(
  defaultMemoize,
  (curr, prev) => {
    if (
      !curr ||
      !prev ||
      typeof curr === 'string' ||
      typeof prev === 'string'
    ) {
      return curr === prev;
    }

    // compare 2 resourceMap
    for (let key in curr) {
      if (curr[key] !== prev[key]) {
        return false;
      }
    }
    for (let key in prev) {
      if (prev[key] !== curr[key]) {
        return false;
      }
    }
    return true;
  }
);

function makeSelector() {
  const graphDataSelector = createGraphDataSelector();
  return createObjectShallowEqualSelector(
    (state, props) => getId(props.resource),
    (state, props) => {
      const graphData = graphDataSelector(state, props) || {};
      const nodeMap = props.nodeMap || graphData.nodeMap;
      const resourceInfo = getResourceInfo(graphData.graph, nodeMap, {
        sort: true
      });

      if (
        !resourceInfo ||
        !resourceInfo.resourceIds ||
        !resourceInfo.resourceIds.length
      ) {
        return;
      }

      return resourceInfo.resourceIds.reduce((resourceMap, id) => {
        resourceMap[id] = nodeMap[id];
        return resourceMap;
      }, {});
    },
    (resourceId, resourceMap) => {
      let potentialDependencies;
      if (resourceId && resourceMap) {
        potentialDependencies = arrayify(
          getPotentialDependencies(
            resourceId,
            Object.keys(resourceMap),
            resourceMap
          )
        )
          .map(id => resourceMap[id])
          .filter(r => r);
      }
      return { resourceMap, potentialDependencies };
    }
  );
}

function makeMapStateToProps() {
  const s = makeSelector();
  return (state, props) => {
    return s(state, props);
  };
}

export default connect(
  makeMapStateToProps,
  {
    updateGraph,
    highlightResource
  }
)(IsBasedOnEditor);
