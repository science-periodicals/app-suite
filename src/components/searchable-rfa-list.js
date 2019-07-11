import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import debounce from 'lodash/debounce';
import { arrayify, getId } from '@scipe/jsonld';
import {
  bemify,
  PaperInput,
  ControlPanel,
  PaperButton,
  ButtonMenu,
  MenuItem
} from '@scipe/ui';
import { searchSettingsRfaList } from '../actions/settings-action-creators';

class SearchableRfaList extends React.Component {
  static propTypes = {
    journal: PropTypes.object.isRequired,
    children: PropTypes.oneOfType([PropTypes.func, PropTypes.element]),

    // redux
    rfas: PropTypes.arrayOf(PropTypes.object),
    nextUrl: PropTypes.string,
    isFetching: PropTypes.bool,
    error: PropTypes.instanceOf(Error),
    searchSettingsRfaList: PropTypes.func.isRequired
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

  search(searchValue, { reset = false } = {}) {
    const { journal, searchSettingsRfaList } = this.props;
    const { filter } = this.state;
    searchSettingsRfaList(journal, {
      actionStatus: filter,
      searchValue,
      reset
    });
  }

  handleClickMore = e => {
    const { journal, nextUrl, searchSettingsRfaList } = this.props;
    searchSettingsRfaList(journal, { nextUrl });
  };

  render() {
    const { rfas, children, isFetching, error, nextUrl } = this.props;

    const { filter, searchValue } = this.state;

    const bem = bemify('searchable-rfa-list');

    return (
      <div className={bem``}>
        <div className={bem`__filter`}>
          <PaperInput
            className={bem`__input`}
            name="searchValue"
            type="search"
            label="Filter rfas"
            value={searchValue}
            onChange={this.handleChange}
          />

          <ButtonMenu>
            <span>
              {filter
                ? filter === 'PotentialActionStatus'
                  ? 'Drafts'
                  : filter === 'ActiveActionStatus'
                  ? 'In progress'
                  : 'Completed'
                : 'All'}
            </span>
            <MenuItem
              disabled={filter == null}
              onClick={this.handleFilter.bind(this, null)}
            >
              All
            </MenuItem>
            <MenuItem
              disabled={filter === 'PotentialActionStatus'}
              onClick={this.handleFilter.bind(this, 'PotentialActionStatus')}
            >
              Drafts
            </MenuItem>
            <MenuItem
              disabled={filter === 'ActiveActionStatus'}
              onClick={this.handleFilter.bind(this, 'ActiveActionStatus')}
            >
              In progress
            </MenuItem>
            <MenuItem
              disabled={filter === 'CompletedActionStatus'}
              onClick={this.handleFilter.bind(this, 'CompletedActionStatus')}
            >
              Completed
            </MenuItem>
          </ButtonMenu>
        </div>

        {typeof children === 'function' ? children(rfas) : children}

        {nextUrl && (
          <ControlPanel error={error}>
            <PaperButton disabled={isFetching} onClick={this.handleClickMore}>
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
    state => state.settingsRfaList,
    state => state.droplets,
    (settingsRfaList, droplets) => {
      return {
        isFetching: settingsRfaList.active,
        error: settingsRfaList.error,
        nextUrl: settingsRfaList.nextUrl,
        rfas: arrayify(settingsRfaList.rfaIds)
          .map(id => droplets[id])
          .filter(Boolean)
      };
    }
  ),
  {
    searchSettingsRfaList
  }
)(SearchableRfaList);
