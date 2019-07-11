import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Iconoclass from '@scipe/iconoclass';
import {
  API_LABELS,
  PaperCheckbox,
  Tag,
  Spinner,
  getCssType,
  getIconNameFromSchema,
  ExpansionPanel,
  ExpansionPanelPreview
} from '@scipe/ui';

export default class Facet extends Component {
  static propTypes = {
    name: PropTypes.string,
    disabledId: PropTypes.string,
    expanded: PropTypes.bool.isRequired,
    facet: PropTypes.string.isRequired,
    facetUiMapValues: PropTypes.array,
    loadingFacets: PropTypes.object.isRequired,
    onToggle: PropTypes.func.isRequired,
    onToggleExpansionPanel: PropTypes.func.isRequired
  };

  static defaultProps = {
    facetUiMapValues: []
  };

  handleClick(propertyId, isChecked, e) {
    e.preventDefault();
    const { facet, onToggle } = this.props;
    onToggle(facet, propertyId, isChecked);
  }

  handleToggleExpansionPanel = isOpen => {
    const { onToggleExpansionPanel } = this.props;
    onToggleExpansionPanel(isOpen);
  };

  renderIcon(facet, propertyId) {
    const { loadingFacets } = this.props;
    const progressMode =
      loadingFacets[facet] && loadingFacets[facet].has(propertyId)
        ? 'spinUp'
        : 'none';

    if (
      facet === 'uncompletedActionType' ||
      facet === 'completedActionType' ||
      facet === 'status'
    ) {
      return (
        <Spinner progressMode={progressMode} size={24}>
          <Iconoclass
            iconName={getIconNameFromSchema(propertyId)}
            iconSize={16}
          />
        </Spinner>
      );
    } else if (facet === 'entityEncodingType') {
      return (
        <Spinner progressMode={progressMode} size={24}>
          <div className={`facet__type-dot color-${getCssType(propertyId)}`} />
        </Spinner>
      );
    } else if (facet === 'journalId') {
      return (
        <Spinner progressMode={progressMode} size={24}>
          <Iconoclass iconName={'journal'} iconSize={16} />
        </Spinner>
      );
    } else if (facet === 'expectedDatePublishedOrRejected') {
      if (propertyId === 'overdue') {
        return (
          <Spinner progressMode={progressMode} size={24}>
            <Iconoclass iconName="warning" iconSize={16} />
          </Spinner>
        );
      } else {
        return <Spinner progressMode={progressMode} size={24} />;
      }
    } else {
      return <Spinner progressMode={progressMode} size={24} />;
    }
  }

  render() {
    const { name, facet, facetUiMapValues, disabledId, expanded } = this.props;

    if (!facetUiMapValues || !facetUiMapValues.length) {
      return null;
    }

    return (
      <ExpansionPanel
        className={`facet`}
        expanded={expanded}
        onChange={this.handleToggleExpansionPanel}
      >
        <ExpansionPanelPreview>
          <h3 className="facet__title">{name}</h3>
        </ExpansionPanelPreview>

        <ul className="facet__list">
          {facetUiMapValues.map(count => {
            return (
              <li className="facet__list-item" key={count.propertyId}>
                <span className="facet__line-left">
                  <PaperCheckbox
                    theme="light"
                    id={count.propertyId}
                    disabled={disabledId && disabledId === count.propertyId}
                    checked={count.checked}
                    onClick={this.handleClick.bind(
                      this,
                      count.propertyId,
                      !count.checked
                    )}
                  >
                    {facet === 'tagId' ? (
                      <Tag
                        tag={Object.assign({ '@id': count.propertyId }, count)}
                        readOnly={true}
                      />
                    ) : (
                      count.name ||
                      API_LABELS[count.propertyId] ||
                      count.propertyId
                    )}
                  </PaperCheckbox>
                  {count.duplicate ? (
                    <span className="facet__id">{count.propertyId}</span>
                  ) : null}
                </span>
                <div className="facet__line-right">
                  {this.renderIcon(facet, count.propertyId)}
                  <span className="facet__value">{count.value}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </ExpansionPanel>
    );
  }
}
