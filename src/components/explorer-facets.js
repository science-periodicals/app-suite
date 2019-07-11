import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import Facet from './facet';
import { getFacetUiMap, getNextQuery } from '../utils/search';
import {
  EXPLORER_ARTICLES_FACETS,
  EXPLORER_RFAS_FACETS,
  EXPLORER_JOURNALS_FACETS
} from '../constants';

class ExplorerFacets extends React.Component {
  static propTypes = {
    mode: PropTypes.oneOf(['journals', 'articles', 'requests']),
    query: PropTypes.object.isRequired,
    onToggleFacet: PropTypes.func.isRequired,

    // redux
    loadingFacets: PropTypes.object.isRequired,
    facetUiMap: PropTypes.object
  };

  constructor(props) {
    super(props);

    // expansion state
    this.state = {
      isAboutIdExpanded: true,
      isEntityEncodingTypeExpanded: true,
      isEntityAboutIdExpanded: true,
      isEntityDetailedDescriptionTypeExpanded: true
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
      isEntityEncodingTypeExpanded,
      isEntityAboutIdExpanded,
      isEntityDetailedDescriptionTypeExpanded
    } = this.state;

    return (
      <aside className="explorer-facets">
        {mode === 'articles' ? (
          <Fragment>
            <Facet
              name="Abstract types"
              facet="entityDetailedDescriptionType"
              facetUiMapValues={facetUiMap.entityDetailedDescriptionType}
              loadingFacets={loadingFacets}
              onToggle={this.handleToggleFacet}
              expanded={isEntityDetailedDescriptionTypeExpanded}
              onToggleExpansionPanel={this.handleToggleExpansionPanel.bind(
                this,
                'isEntityDetailedDescriptionTypeExpanded'
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
        ) : (
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
      return props.mode === 'journals'
        ? state.journalsFacetMap
        : props.mode === 'articles'
        ? state.articlesFacetMap
        : state.rfasFacetMap;
    },
    (state, props) => {
      return props.mode === 'journals'
        ? state.journalsSearchResults.loadingFacets
        : props.mode === 'articles'
        ? state.articlesSearchResults.loadingFacets
        : state.rfasSearchResults.loadingFacets;
    },
    (mode, query, facetMap = {}, loadingFacets = {}) => {
      return {
        facetUiMap: getFacetUiMap(
          mode === 'articles'
            ? EXPLORER_ARTICLES_FACETS
            : mode === 'journals'
            ? EXPLORER_JOURNALS_FACETS
            : EXPLORER_RFAS_FACETS,
          facetMap,
          query
        ),
        loadingFacets
      };
    }
  )
)(ExplorerFacets);
