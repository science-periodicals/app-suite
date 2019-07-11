import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { parseIndexableString } from '@scipe/collate';
import { createSelector } from 'reselect';
import debounce from 'lodash/debounce';
import { arrayify, getId } from '@scipe/jsonld';
import { getScopeId } from '@scipe/librarian';
import { PaperInput, PaperButton, ControlPanel } from '@scipe/ui';
import { searchSettingsArticleList } from '../actions/settings-action-creators';

class SearchableArticleList extends React.Component {
  static propTypes = {
    journal: PropTypes.object.isRequired, // used to restrict the search to only article of that journal
    issue: PropTypes.object, // if set will narrow the search to the article of that specific issue (need to be compatible with `journal`)
    children: PropTypes.func,

    // redux
    graphs: PropTypes.arrayOf(PropTypes.object),
    nextUrl: PropTypes.string,
    status: PropTypes.shape({
      active: PropTypes.bool,
      error: PropTypes.instanceOf(Error)
    }).isRequired,
    searchSettingsArticleList: PropTypes.func.isRequired
  };

  static getDerivedStateFromProps(props, state) {
    if (getId(props.journal) !== getId(state.lastJournal)) {
      return {
        searchValue: '',
        lastJournal: props.journal
      };
    }
    return null;
  }

  constructor(props) {
    super(props);
    this.state = { searchValue: '', lastJournal: props.journal };

    this.debouncedSearch = debounce(this.search.bind(this), 500);
  }

  componentDidMount() {
    this.search(undefined, { reset: true });
  }

  componentWillUnmount() {
    this.debouncedSearch.cancel();
    if (this.xhr) {
      this.xhr.abort();
    }
  }

  componentDidUpdate(prevProps) {
    if (
      getId(this.props.journal) !== getId(prevProps.journal) ||
      getId(this.props.issue) !== getId(prevProps.issue)
    ) {
      this.search(undefined, { reset: true });
    }
  }

  handleChange = e => {
    const value = e.target.value;
    if (e.target.name === 'searchValue') {
      if (value !== this.state.searchValue) {
        this.debouncedSearch(value);
      }
    }
    this.setState({
      [e.target.name]: value
    });
  };

  search(searchValue, { reset = false } = {}) {
    const { journal, issue, searchSettingsArticleList } = this.props;
    searchSettingsArticleList(journal, { issue, searchValue, reset });
  }

  handleClickMore = e => {
    const { journal, nextUrl, searchSettingsArticleList } = this.props;
    searchSettingsArticleList(journal, { nextUrl });
  };

  render() {
    const { searchValue } = this.state;
    const {
      children,
      journal,
      graphs,
      nextUrl,
      status: { active, error }
    } = this.props;

    if (!journal) {
      return null;
    }

    // TODO display loading progress
    return (
      <div className="searchable-article-list">
        <div className="searchable-article-list__filter">
          <PaperInput
            name="searchValue"
            label="Filter articles"
            type="search"
            value={searchValue}
            onChange={this.handleChange}
          />
        </div>
        {children ? children(graphs) : null}
        {nextUrl && (
          <ControlPanel error={error}>
            <PaperButton disabled={active} onClick={this.handleClickMore}>
              More
            </PaperButton>
          </ControlPanel>
        )}
      </div>
    );
  }
}

export default connect(
  createSelector(
    state => state.settingsArticleList,
    state => state.droplets,
    (settingsArticleList, droplets) => {
      return {
        status: settingsArticleList,
        nextUrl: settingsArticleList.nextUrl,
        graphs: arrayify(settingsArticleList.graphIds)
          .map(id => {
            const scopeId = getScopeId(id);
            if (scopeId) {
              return Object.values(droplets).find(droplet => {
                if (droplet._id) {
                  const [, , version] = parseIndexableString(droplet._id);
                  return (
                    droplet['@type'] === 'Graph' &&
                    version === 'latest' &&
                    droplet.version != null &&
                    getScopeId(droplet) === scopeId
                  );
                }
              });
            }
          })
          .filter(Boolean)
      };
    }
  ),
  {
    searchSettingsArticleList
  }
)(SearchableArticleList);
