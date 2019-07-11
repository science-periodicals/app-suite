import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import debounce from 'lodash/debounce';
import { arrayify, getId } from '@scipe/jsonld';
import {
  ButtonMenu,
  MenuItem,
  PaperInput,
  ControlPanel,
  PaperButton
} from '@scipe/ui';
import { searchSettingsIssueList } from '../actions/settings-action-creators';

class SearchableIssueList extends React.Component {
  static propTypes = {
    journal: PropTypes.object.isRequired,
    children: PropTypes.func,

    // redux
    issues: PropTypes.arrayOf(PropTypes.object),
    nextUrl: PropTypes.string,
    status: PropTypes.shape({
      active: PropTypes.bool,
      error: PropTypes.instanceOf(Error)
    }).isRequired,
    searchSettingsIssueList: PropTypes.func.isRequired
  };

  static getDerivedStateFromProps(props, state) {
    if (getId(props.journal) !== getId(state.lastJournal)) {
      return {
        filter: null,
        lastJournal: props.journal
      };
    }
    return null;
  }

  constructor(props) {
    super(props);
    this.state = {
      filter: null,
      lastJournal: props.journal,
      searchValue: ''
    };
    this.debouncedSearch = debounce(this.search.bind(this), 500);
  }

  componentDidMount() {
    const { searchValue } = this.state;
    this.search(searchValue, { reset: true });
  }

  componentDidUpdate(prevProps) {
    if (getId(this.props.journal) !== getId(prevProps.journal)) {
      this.search(undefined, { reset: true });
    }
  }

  componentWillUnmount() {
    this.debouncedSearch.cancel();
    if (this.xhr) {
      this.xhr.abort();
    }
  }

  handleFilter(filter) {
    this.setState(
      {
        filter
      },
      () => {
        const { searchValue } = this.state;
        this.search(searchValue);
      }
    );
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
    const { journal, searchSettingsIssueList } = this.props;
    const { filter } = this.state;
    searchSettingsIssueList(journal, {
      type: filter,
      searchValue,
      reset
    });
  }

  handleClickMore = e => {
    const { journal, nextUrl, searchSettingsIssueList } = this.props;
    searchSettingsIssueList(journal, { nextUrl });
  };

  render() {
    const {
      issues,
      children,
      status: { active, error },
      nextUrl
    } = this.props;

    const { filter, searchValue } = this.state;

    return (
      <div className="searchable-issue-list">
        <div className="searchable-issue-list__filter">
          <PaperInput
            className="searchable-issue-list__input"
            name="searchValue"
            type="search"
            label="Filter issues"
            value={searchValue}
            onChange={this.handleChange}
          />

          <ButtonMenu>
            <span>
              {filter
                ? filter === 'PublicationIssue'
                  ? 'Sequential Issues'
                  : 'Special Issues'
                : 'All Issues'}
            </span>
            <MenuItem
              disabled={filter == null}
              onClick={this.handleFilter.bind(this, null)}
            >
              All Issues
            </MenuItem>
            <MenuItem
              disabled={filter === 'PublicationIssue'}
              onClick={this.handleFilter.bind(this, 'PublicationIssue')}
            >
              Sequential Issues
            </MenuItem>
            <MenuItem
              disabled={filter === 'SpecialPublicationIssue'}
              onClick={this.handleFilter.bind(this, 'SpecialPublicationIssue')}
            >
              Special Issues
            </MenuItem>
          </ButtonMenu>
        </div>

        {children ? children(issues) : null}

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
    state => state.settingsIssueList,
    state => state.droplets,
    (settingsIssueList, droplets) => {
      return {
        status: settingsIssueList,
        nextUrl: settingsIssueList.nextUrl,
        issues: arrayify(settingsIssueList.issueIds)
          .map(id => droplets[id])
          .filter(Boolean)
      };
    }
  ),
  {
    searchSettingsIssueList
  }
)(SearchableIssueList);
