import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import pick from 'lodash/pick';
import { getId, arrayify, getNodeMap } from '@scipe/jsonld';
import { updateGraph } from '../actions/graph-action-creators';
import { SubjectEditor } from '@scipe/ui';
import Annotable from './annotable';
import Counter from '../utils/counter';

class AboutEditor extends PureComponent {
  static propTypes = {
    resource: PropTypes.object,
    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string, // the CreateReleaseAction or TypesettingAction @id providing the resource (required when editable)
    ontology: PropTypes.string,
    nodeMap: PropTypes.object,
    annotable: PropTypes.bool.isRequired,

    counter: PropTypes.instanceOf(Counter).isRequired,
    readOnly: PropTypes.bool.isRequired,
    disabled: PropTypes.bool.isRequired,

    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,

    displayAnnotations: PropTypes.bool.isRequired,
    displayPermalink: PropTypes.bool,

    // redux
    updateGraph: PropTypes.func.isRequired
  };

  static defaultProps = {
    ontology: 'subjects'
  };

  handleAdd = tag => {
    const { graphId, resource, actionId } = this.props;
    this.props.updateGraph(
      graphId,
      actionId,
      {
        '@graph': [
          {
            '@id': getId(resource),
            about: arrayify(resource.about)
              .filter(about => getId(about) !== getId(tag))
              .concat(pick(tag, ['@id', '@type', 'name']))
          }
        ]
      },
      { mergeStrategy: 'ReconcileMergeStrategy' }
    );
  };

  handleDelete = ids => {
    const { graphId, resource, actionId } = this.props;

    this.props.updateGraph(
      graphId,
      actionId,
      {
        '@graph': [
          {
            '@id': getId(resource),
            about: arrayify(resource.about).filter(
              about => !arrayify(ids).some(id => getId(about) === getId(id))
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
      ontology,
      createSelector,
      matchingLevel
    } = this.props;

    const semanticTagsMap = getNodeMap(
      arrayify(resource.about).filter(subject => {
        const subjectId = getId(subject);
        return subjectId && subjectId.startsWith('subjects:');
      })
    );

    return (
      <div className="about">
        <Annotable
          graphId={graphId}
          counter={counter}
          selector={createSelector(
            {
              '@type': 'NodeSelector',
              graph: graphId,
              node: getId(resource),
              selectedProperty: 'about'
            },
            `about-editor-${getId(
              resource
            )}-${graphId}` /* we need graphId as user can toggle versions */
          )}
          matchingLevel={matchingLevel}
          selectable={false}
          annotable={annotable}
          displayAnnotations={displayAnnotations}
          displayPermalink={displayPermalink}
        >
          <SubjectEditor
            label="Add Subject"
            readOnly={readOnly}
            disabled={disabled}
            entity={resource}
            ontology={ontology}
            semanticTagsMap={semanticTagsMap}
            onAdd={this.handleAdd}
            onDelete={this.handleDelete}
          />
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
)(AboutEditor);
