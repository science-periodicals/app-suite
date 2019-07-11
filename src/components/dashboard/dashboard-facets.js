import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import Facet from '../facet';
import { getFacetUiMap, getNextQuery } from '../../utils/search';
import { DASHBOARD_FACETS } from '../../constants';

// TODO histogram date facet
// TODO only display publicationType facet when there is only 1 journal

class DahsboardFacets extends PureComponent {
  static propTypes = {
    onToggleFacet: PropTypes.func.isRequired,
    loadingFacets: PropTypes.object.isRequired,
    facetUiMap: PropTypes.object,
    query: PropTypes.object.isRequired,
    onPanelClick: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);

    // expansion state
    this.state = {
      isJournalIdExpanded: true,
      isTagIdExpanded: true,
      isAdditionalTypeIdExpanded: true,
      // isStatusExpanded: true,
      isExpectedDatePublishedOrRejectedExpanded: true,
      isUncompletedActionTypeExpanded: true,
      //isCompletedActionTypeExpanded: true,
      isDatePublishedOrRejectedExpanded: true
    };
  }

  handleToggleFacet = (facet, propertyId, nextChecked) => {
    const { query, facetUiMap } = this.props;
    const nextQuery = getNextQuery(query, facet, propertyId, facetUiMap[facet]);

    this.props.onToggleFacet(nextQuery);
  };

  handleToggleExpansionPanel(name, isOpen) {
    this.setState({ [name]: isOpen });
  }

  render() {
    const { facetUiMap, loadingFacets, onPanelClick } = this.props;

    const {
      isJournalIdExpanded,
      isTagIdExpanded,
      isAdditionalTypeIdExpanded,
      // isStatusExpanded,
      isExpectedDatePublishedOrRejectedExpanded,
      isUncompletedActionTypeExpanded,
      // isCompletedActionTypeExpanded,
      isDatePublishedOrRejectedExpanded
    } = this.state;

    // facet-panel-container is needed to create a z-index context differnt from the one of facet-panel
    return (
      <aside className={'dashboard-facets'} onClick={onPanelClick}>
        <Facet
          name="Journals"
          facet="journalId"
          facetUiMapValues={facetUiMap.journalId}
          loadingFacets={loadingFacets}
          onToggle={this.handleToggleFacet}
          expanded={isJournalIdExpanded}
          onToggleExpansionPanel={this.handleToggleExpansionPanel.bind(
            this,
            'isJournalIdExpanded'
          )}
        />
        <Facet
          name="Tags"
          facet="tagId"
          facetUiMapValues={facetUiMap.tagId}
          loadingFacets={loadingFacets}
          onToggle={this.handleToggleFacet}
          expanded={isTagIdExpanded}
          onToggleExpansionPanel={this.handleToggleExpansionPanel.bind(
            this,
            'isTagIdExpanded'
          )}
        />
        <Facet
          name="Publication types"
          facet="additionalTypeId"
          facetUiMapValues={facetUiMap.additionalTypeId}
          loadingFacets={loadingFacets}
          onToggle={this.handleToggleFacet}
          expanded={isAdditionalTypeIdExpanded}
          onToggleExpansionPanel={this.handleToggleExpansionPanel.bind(
            this,
            'isAdditionalTypeIdExpanded'
          )}
        />

        <Facet
          name="In progress"
          facet="expectedDatePublishedOrRejected"
          facetUiMapValues={facetUiMap.expectedDatePublishedOrRejected}
          loadingFacets={loadingFacets}
          onToggle={this.handleToggleFacet}
          expanded={isExpectedDatePublishedOrRejectedExpanded}
          onToggleExpansionPanel={this.handleToggleExpansionPanel.bind(
            this,
            'isExpectedDatePublishedOrRejectedExpanded'
          )}
        />

        {/*
            <Facet
            name="Status"
            facet="status"
            facetUiMapValues={facetUiMap.status}
            loadingFacets={loadingFacets}
            onToggle={this.handleToggleFacet}
            expanded={isStatusExpanded}
            onToggleExpansionPanel={this.handleToggleExpansionPanel.bind(
            this,
            'isStatusExpanded'
            )}
            />*/}
        <Facet
          name="Outstanding actions"
          facet="uncompletedActionType"
          facetUiMapValues={facetUiMap.uncompletedActionType}
          loadingFacets={loadingFacets}
          onToggle={this.handleToggleFacet}
          expanded={isUncompletedActionTypeExpanded}
          onToggleExpansionPanel={this.handleToggleExpansionPanel.bind(
            this,
            'isUncompletedActionTypeExpanded'
          )}
        />

        <Facet
          name="Completed"
          facet="datePublishedOrRejected"
          facetUiMapValues={facetUiMap.datePublishedOrRejected}
          loadingFacets={loadingFacets}
          onToggle={this.handleToggleFacet}
          expanded={isDatePublishedOrRejectedExpanded}
          onToggleExpansionPanel={this.handleToggleExpansionPanel.bind(
            this,
            'isDatePublishedOrRejectedExpanded'
          )}
        />

        {/*
            <Facet
            name="Completed actions"
            facet="completedActionType"
            facetUiMapValues={facetUiMap.completedActionType}
            loadingFacets={loadingFacets}
            onToggle={this.handleToggleFacet}
            expanded={isCompletedActionTypeExpanded}
            onToggleExpansionPanel={this.handleToggleExpansionPanel.bind(
            this,
            'isCompletedActionTypeExpanded'
            )}
            />*/}
      </aside>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => props.query,
    state => state.graphFacetMap,
    state => state.graphSearchResults.loadingFacets,
    (query, graphFacetMap, loadingFacets) => {
      return {
        facetUiMap: getFacetUiMap(DASHBOARD_FACETS, graphFacetMap, query),
        loadingFacets
      };
    }
  )
)(DahsboardFacets);
