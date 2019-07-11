import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import { arrayify, getId } from '@scipe/jsonld';
import { createId } from '@scipe/librarian';
import { PaperActionButton } from '@scipe/ui';
import AnnotableContributorListItem from './annotable-contributor-list-item';
import { repositionAnnotations } from '../actions/annotation-action-creators';
import { updateGraph } from '../actions/graph-action-creators';
import { openShell, closeShell } from '../actions/ui-action-creators';
import Notice from './notice';
import Counter from '../utils/counter';

// TODO for corresponding author we consider that author listed in the Graph are
// corresponding author. We could represent those with a star icon or smtg

class AnnotableContributorList extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,

    graphId: PropTypes.string.isRequired,
    actionId: PropTypes.string, // the `CreateReleaseAction` or `TypesettingAction` or `PublishAction` @id providing the resource (required when editable)
    action: PropTypes.shape({
      '@type': PropTypes.oneOf([
        'CreateReleaseAction',
        'TypesettingAction',
        'PublishAction'
      ]).isRequired
    }),
    resource: PropTypes.object,
    property: PropTypes.oneOf(['author', 'contributor']).isRequired,
    counter: PropTypes.instanceOf(Counter).isRequired,
    createSelector: PropTypes.func.isRequired,
    matchingLevel: PropTypes.number,
    releaseRequirement: PropTypes.oneOf([
      'SubmissionReleaseRequirement',
      'ProductionReleaseRequirement'
    ]),

    readOnly: PropTypes.bool,
    disabled: PropTypes.bool,
    annotable: PropTypes.bool,
    displayAnnotations: PropTypes.bool,
    displayPermalink: PropTypes.bool,

    blindingData: PropTypes.object.isRequired,

    // redux
    repositionAnnotations: PropTypes.func.isRequired,
    updateGraph: PropTypes.func.isRequired,
    openShell: PropTypes.func.isRequired,
    closeShell: PropTypes.func.isRequired
  };

  static defaultProps = {
    resource: {}
  };

  constructor(props) {
    super(props);

    const { resource, property } = props;
    this.state = {
      contributors: arrayify(resource[property]).slice()
    };
  }

  componentWillReceiveProps(nextProps) {
    if (
      nextProps.resource !== this.props.resource ||
      nextProps.property !== this.props.property
    ) {
      this.setState({
        contributors: arrayify(nextProps.resource[nextProps.property]).slice()
      });
    }
  }

  handleOrder = (itemId, hoveredId, dropped) => {
    const { contributors: items } = this.state;
    const nextItems = items.slice();

    const index = items.findIndex(contributor => getId(contributor) === itemId);
    const hoveredIndex = items.findIndex(
      contributor => getId(contributor) === hoveredId
    );

    const item = nextItems[index];
    const hovered = nextItems[hoveredIndex];
    nextItems[index] = hovered;
    nextItems[hoveredIndex] = item;

    this.setState({ contributors: nextItems });

    if (dropped) {
      this.props.repositionAnnotations();
      // TODO update action
    }
  };

  handleAdd = e => {
    const { graphId, actionId, resource, property, disabled } = this.props;

    const newRole = {
      '@id': createId('blank')['@id'],
      '@type': 'ContributorRole',
      [property]: {
        '@id': createId('blank')['@id'],
        '@type': 'Person'
      }
    };

    this.props.updateGraph(
      graphId,
      actionId,
      {
        '@graph': [
          {
            '@id': getId(resource),
            [property]: arrayify(resource[property]).concat(newRole)
          }
        ]
      },
      { mergeStrategy: 'ReconcileMergeStrategy' }
    );

    const selector = {
      '@type': 'NodeSelector',
      node: getId(resource),
      selectedProperty: property,
      selectedItem: getId(newRole)
    };

    this.props.openShell('edit', getId(newRole), { selector, disabled });
  };

  handleDelete(roleId) {
    const { graphId, actionId, resource, property } = this.props;
    this.props.updateGraph(
      graphId,
      actionId,
      {
        '@id': getId(resource),
        [property]: arrayify(resource[property]).filter(
          node => getId(node) !== roleId
        )
      },
      { mergeStrategy: 'ReconcileMergeStrategy' }
    );

    this.props.closeShell();
  }

  render() {
    const {
      id,
      className,
      resource,
      counter,
      property,
      disabled,
      readOnly,
      blindingData,
      ...others
    } = this.props;
    const { contributors } = this.state;

    const canViewAuthorIdentity = blindingData.visibleRoleNames.has('author');

    return (
      <div
        id={id}
        className={classNames(className, 'annotable-contributor-list')}
      >
        {!canViewAuthorIdentity && (
          <Notice iconName="anonymous">
            The person and organization names have been anonymized
          </Notice>
        )}

        <ol className="sa__clear-list-styles">
          {contributors.map((contributor, i) => (
            <AnnotableContributorListItem
              key={getId(contributor)}
              {...others}
              counter={counter.increment({
                level: 5,
                key: `annotable-contributor-list-${getId(contributor)}`
              })}
              blindingData={blindingData}
              disabled={disabled}
              readOnly={readOnly}
              onOrder={this.handleOrder}
              onDelete={this.handleDelete.bind(this, getId(contributor))}
              resource={resource}
              property={property}
              contributor={contributor}
            />
          ))}
        </ol>

        {!readOnly && canViewAuthorIdentity && (
          <div className="annotable-contributor-list__add">
            <PaperActionButton
              iconName="add"
              disabled={disabled}
              large={false}
              onClick={this.handleAdd}
            />
          </div>
        )}
      </div>
    );
  }
}

export default connect(
  null,
  {
    repositionAnnotations,
    updateGraph,
    openShell,
    closeShell
  }
)(AnnotableContributorList);
