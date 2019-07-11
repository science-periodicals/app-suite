import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { arrayify, getId } from '@scipe/jsonld';
import { LicenseAutocomplete, BemTags } from '@scipe/ui';
import { updateGraph } from '../actions/graph-action-creators';
import Annotable from './annotable';
import License from './license';
import Counter from '../utils/counter';

class LicenseEditor extends Component {
  static propTypes = {
    resource: PropTypes.object,
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string, // the CreateReleaseAction or TypesettingAction @id providing the resource (required when editable)
    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,

    annotable: PropTypes.bool.isRequired,
    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,

    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    // redux
    updateGraph: PropTypes.func.isRequired
  };

  handleSubmit = (value, item) => {
    const { graphId, actionId, resource, updateGraph } = this.props;
    const uri = getId(item) || item.url;
    updateGraph(
      graphId,
      actionId,
      {
        '@graph': [
          {
            '@id': getId(resource),
            license: arrayify(resource.license)
              .filter(license => getId(license) !== uri)
              .concat(uri)
          }
        ]
      },
      { mergeStrategy: 'ReconcileMergeStrategy' }
    );
    this.autocomplete.reset();
  };

  handleDelete = license => {
    const { graphId, actionId, resource, updateGraph } = this.props;

    const uri = getId(license) || license.url;

    updateGraph(
      graphId,
      actionId,
      {
        '@graph': [
          {
            '@id': getId(resource),
            license: arrayify(resource.license).filter(
              license => getId(license) !== uri
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
      counter,
      annotable,
      displayAnnotations,
      displayPermalink,
      createSelector,
      matchingLevel
    } = this.props;

    const licenses = arrayify(resource.license);

    const bem = BemTags();

    return (
      <div className={bem`license-editor`}>
        <Annotable
          className={bem`annotable-autocomplete`}
          graphId={graphId}
          selector={createSelector(
            {
              '@type': 'NodeSelector',
              graph: graphId,
              node: getId(resource),
              selectedProperty: 'license'
            },
            `license-editor-${getId(
              resource
            )}-${graphId}` /* we need graphId as user can toggle versions */
          )}
          matchingLevel={matchingLevel}
          counter={counter}
          annotable={annotable}
          displayAnnotations={displayAnnotations}
          displayPermalink={displayPermalink}
        >
          <div>
            {!!licenses.length && (
              <ul className={bem`__list`}>
                {licenses.map(license => (
                  <li className={bem`__list-item`} key={getId(license)}>
                    <License
                      license={license}
                      onDelete={this.handleDelete}
                      readOnly={readOnly}
                      disabled={disabled}
                    />
                  </li>
                ))}
              </ul>
            )}

            {!readOnly && (
              <LicenseAutocomplete
                ref={el => {
                  this.autocomplete = el;
                }}
                name="license"
                label="Add license"
                readOnly={readOnly}
                disabled={disabled}
                onSubmit={this.handleSubmit}
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
)(LicenseEditor);
