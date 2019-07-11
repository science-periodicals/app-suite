import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { arrayify, getId } from '@scipe/jsonld';
import { ProgrammingLanguageAutocomplete, BemTags } from '@scipe/ui';
import { updateGraph } from '../actions/graph-action-creators';
import Annotable from './annotable';
import ProgrammmingLanguage from './programming-language';
import Counter from '../utils/counter';

class ProgrammingLanguageEditor extends Component {
  static propTypes = {
    resource: PropTypes.object,
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string, // the CreateReleaseAction or TypesettingAction @id providing the resource (required when editable)
    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,
    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,
    roleNameData: PropTypes.object.isRequired,
    blindingData: PropTypes.object.isRequired,

    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    // redux
    updateGraph: PropTypes.func.isRequired
  };

  static defaultProps = {
    resource: {}
  };

  handleSubmit = (value, item = {}) => {
    const { graphId, actionId, resource, updateGraph } = this.props;
    updateGraph(
      graphId,
      actionId,
      {
        '@graph': [
          {
            '@id': getId(resource),
            programmingLanguage: arrayify(resource.programmingLanguage)
              .filter(name => name !== item.name)
              .concat(item.name)
          }
        ]
      },
      { mergeStrategy: 'ReconcileMergeStrategy' }
    );
    this.autocomplete.reset();
  };

  handleDelete = (programmingLanguage, e) => {
    const { graphId, actionId, resource, updateGraph } = this.props;

    updateGraph(
      graphId,
      actionId,
      {
        '@graph': [
          {
            '@id': getId(resource),
            programmingLanguage: arrayify(resource.programmingLanguage).filter(
              name => name !== programmingLanguage.name
            )
          }
        ]
      },
      { mergeStrategy: 'ReconcileMergeStrategy' }
    );
  };

  render() {
    const {
      graphId,
      resource,
      readOnly,
      disabled,
      annotable,
      displayAnnotations,
      displayPermalink,
      counter,
      createSelector,
      matchingLevel
    } = this.props;

    const bem = BemTags();

    return (
      <div className={bem`programming-language-editor`}>
        <Annotable
          graphId={graphId}
          selector={createSelector({
            '@type': 'NodeSelector',
            graph: graphId,
            node: getId(resource),
            selectedProperty: 'programmingLanguage'
          })}
          matchingLevel={matchingLevel}
          counter={counter.increment({
            level: 5,
            key: `programming-language-editor-${getId(resource)}`
          })}
          annotable={annotable}
          displayAnnotations={displayAnnotations}
          displayPermalink={displayPermalink}
        >
          <div>
            <ul className={bem`list`}>
              {arrayify(resource.programmingLanguage).map(
                programmingLanguage => (
                  <li key={programmingLanguage}>
                    <ProgrammmingLanguage
                      programmingLanguage={programmingLanguage}
                      onDelete={this.handleDelete}
                      readOnly={readOnly}
                      disabled={disabled}
                    />
                  </li>
                )
              )}
            </ul>

            {!readOnly && (
              <ProgrammingLanguageAutocomplete
                ref={el => {
                  this.autocomplete = el;
                }}
                label="Add programming language"
                name="programmingLanguage"
                onSubmit={this.handleSubmit}
                readOnly={readOnly}
                disabled={disabled}
              />
            )}
          </div>
        </Annotable>
      </div>
    );
  }
}

export default connect(
  null,
  {
    updateGraph
  }
)(ProgrammingLanguageEditor);
