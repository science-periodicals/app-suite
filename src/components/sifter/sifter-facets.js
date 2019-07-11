import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import Facet from '../facet';
import { getFacetUiMap, getNextQuery } from '../../utils/search';
import {
  SIFTER_FACETS,
  ISSUE_FACETS,
  EXPLORER_RFAS_FACETS
} from '../../constants';

class SifterFacets extends React.Component {
  static propTypes = {
    mode: PropTypes.oneOf([
      'journal', // journal homepage, search for articles
      'issues', // list of issues (search for issues)
      'issue', // issue homepage (search for article within that issue)
      'requests'
    ]),
    onToggleFacet: PropTypes.func.isRequired,
    loadingFacets: PropTypes.object.isRequired,
    facetUiMap: PropTypes.object,
    query: PropTypes.object.isRequired
  };

  constructor(props) {
    super(props);

    // expansion state
    this.state = {
      isAboutIdExpanded: true,
      isTypeExpanded: true,
      isDatePublishedExpanded: true,
      isAdditionalTypeIdExpanded: true,
      isEntityEncodingTypeExpanded: true,
      isEntityAboutIdExpanded: true
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
    const { facetUiMap, loadingFacets, mode } = this.props;

    const {
      isAboutIdExpanded,
      isTypeExpanded,
      isDatePublishedExpanded,
      isAdditionalTypeIdExpanded,
      isEntityEncodingTypeExpanded,
      isEntityAboutIdExpanded
    } = this.state;

    return (
      <aside className="sifter-facets">
        {mode === 'issues' ? (
          <Fragment>
            <Facet
              name="Types"
              facet="@type"
              facetUiMapValues={facetUiMap['@type']}
              loadingFacets={loadingFacets}
              onToggle={this.handleToggleFacet}
              expanded={isTypeExpanded}
              onToggleExpansionPanel={this.handleToggleExpansionPanel.bind(
                this,
                'isTypeExpanded'
              )}
            />
            {/* TODO represent as histogram ? */}
            <Facet
              name="Publication Dates"
              facet="datePublished"
              facetUiMapValues={facetUiMap.datePublished}
              loadingFacets={loadingFacets}
              onToggle={this.handleToggleFacet}
              expanded={isDatePublishedExpanded}
              onToggleExpansionPanel={this.handleToggleExpansionPanel.bind(
                this,
                'isDatePublishedExpanded'
              )}
            />
          </Fragment>
        ) : mode === 'requests' ? (
          <Facet
            name="Subjects"
            facet="aboutId"
            facetUiMapValues={facetUiMap.aboutId}
            loadingFacets={loadingFacets}
            onToggle={this.handleToggleFacet}
            expanded={isAboutIdExpanded}
            onToggleExpansionPanel={this.handleToggleExpansionPanel.bind(
              this,
              'isAboutIdExpanded'
            )}
          />
        ) : (
          <Fragment>
            <Facet
              name="Publication Types"
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
              name="Resource Types"
              facet="entityEncodingType"
              facetUiMapValues={facetUiMap.entityEncodingType}
              loadingFacets={loadingFacets}
              onToggle={this.handleToggleFacet}
              expanded={isEntityEncodingTypeExpanded}
              onToggleExpansionPanel={this.handleToggleExpansionPanel.bind(
                this,
                'isEntityEncodingTypeExpanded'
              )}
            />
            <Facet
              name="Subjects"
              facet="entityAboutId"
              facetUiMapValues={facetUiMap.entityAboutId}
              loadingFacets={loadingFacets}
              onToggle={this.handleToggleFacet}
              expanded={isEntityAboutIdExpanded}
              onToggleExpansionPanel={this.handleToggleExpansionPanel.bind(
                this,
                'isEntityAboutIdExpanded'
              )}
            />
          </Fragment>
        )}
      </aside>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => props.mode,
    (state, props) => props.query,
    (state, props) => {
      return props.mode === 'issues'
        ? state.issueFacetMap
        : props.mode === 'requests'
        ? state.rfasFacetMap
        : state.graphFacetMap;
    },
    (state, props) => {
      return props.mode === 'issues'
        ? state.issueSearchResults.loadingFacets
        : props.mode === 'requests'
        ? state.rfasSearchResults.loadingFacets
        : state.graphSearchResults.loadingFacets;
    },
    (mode, query, facetMap = {}, loadingFacets = {}) => {
      // TODO fix name
      return {
        facetUiMap: getFacetUiMap(
          mode == 'issues'
            ? ISSUE_FACETS
            : mode === 'requests'
            ? EXPLORER_RFAS_FACETS
            : SIFTER_FACETS,
          facetMap,
          query
        ),
        loadingFacets
      };
    }
  )
)(SifterFacets);
