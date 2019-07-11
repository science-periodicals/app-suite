import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { createSelector } from 'reselect';
import { getId, unprefix } from '@scipe/jsonld';
import Iconoclass from '@scipe/iconoclass';
import { JournalBadge, OrganizationBadge, Value, BemTags } from '@scipe/ui';
import {
  fetchSettingsJournalList,
  fetchSettingsOrganizationList
} from '../../actions/settings-action-creators';

class SettingsPanel extends Component {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,
    journals: PropTypes.arrayOf(PropTypes.object),
    organizations: PropTypes.arrayOf(PropTypes.object),
    fetchSettingsJournalList: PropTypes.func,
    fetchSettingsOrganizationList: PropTypes.func,
    onPanelClick: PropTypes.func.isRequired
  };

  componentDidMount() {
    this.props.fetchSettingsJournalList();
    this.props.fetchSettingsOrganizationList();
  }

  handleNewLink = e => {
    const { disabled } = this.props;
    if (disabled) {
      e.preventDefault();
    }
  };

  render() {
    const bem = BemTags();
    const { journals, organizations, disabled, onPanelClick } = this.props;

    return (
      <nav className={bem`settings-panel`} onClick={onPanelClick}>
        <section className={bem`__section`}>
          <h2 className={bem`__subheader`}>
            <Iconoclass
              iconName="person"
              round={true}
              style={{ marginRight: '.8rem' }}
            />
            Personal settings
          </h2>
          <ul className={bem`__list`}>
            <li className={bem`__list-item`}>
              <Iconoclass
                iconName="personOutline"
                style={{ marginRight: '.8rem' }}
              />
              <Link to={{ pathname: '/settings/profile' }}>Public profile</Link>
            </li>
            <li className={bem`__list-item`}>
              <Iconoclass iconName="email" style={{ marginRight: '.8rem' }} />
              <Link to={{ pathname: '/settings/contact-points' }}>
                Contact points
              </Link>
            </li>
            <li className={bem`__list-item`}>
              <Iconoclass
                iconName="accessClosed"
                style={{ marginRight: '.8rem' }}
              />
              <Link to={{ pathname: '/settings/password' }}>Password</Link>
            </li>
          </ul>
        </section>

        {/* Journals */}
        <section className={bem`__section`}>
          <h2 className={bem`__subheader`}>
            <Iconoclass
              iconName="journal"
              round={false}
              style={{ marginRight: '.6rem', marginLeft: '-.2rem' }}
            />
            Journal settings
          </h2>
          <ul className={bem`__list`}>
            {journals.map(journal => (
              <li className={bem`__list-item`} key={getId(journal)}>
                <Link
                  to={{
                    pathname: `/settings/journal/${unprefix(getId(journal))}`
                  }}
                  className={bem`__journal`}
                >
                  <JournalBadge journal={journal} link={false} size={21} />
                  <Value>
                    {journal.name || journal.alternateName || journal.url}
                  </Value>
                </Link>
              </li>
            ))}

            {!disabled && (
              <li className={bem`__list-item`} key="add-periodical">
                <Link
                  to={{ pathname: `/new/journal` }}
                  className={bem`__journal`}
                  onClick={this.handleNewLink}
                >
                  <Iconoclass
                    size="21px"
                    disabled={disabled}
                    iconName="add"
                    round={true}
                    style={{
                      marginRight: '.6rem',
                      marginLeft: '-.2rem'
                    }}
                  />
                  Add journal
                </Link>
              </li>
            )}
          </ul>
        </section>

        {/* Organizations */}
        <section className={bem`__section`}>
          <h2 className={bem`__subheader`}>
            <Iconoclass
              iconName="organization"
              round={false}
              style={{ marginRight: '.6rem', marginLeft: '-.2rem' }}
            />
            Organization settings
          </h2>
          <ul className={bem`__list`}>
            {organizations.map(org => (
              <li className={bem`__list-item`} key={getId(org)}>
                <Link
                  to={{
                    pathname: `/settings/organization/${unprefix(getId(org))}`
                  }}
                  className={bem`__organization`}
                >
                  <OrganizationBadge organization={org} size={21} />
                  <Value>{org.name}</Value>
                </Link>
              </li>
            ))}

            {!disabled && (
              <li className={bem`__list-item`} key="add-org">
                <Link
                  to={{ pathname: `/new/organization` }}
                  className={bem`__organization`}
                  onClick={this.handleNewLink}
                >
                  <Iconoclass
                    size="21px"
                    iconName="add"
                    round={true}
                    disabled={disabled}
                    style={{
                      marginRight: '.6rem',
                      marginLeft: '-.2rem'
                    }}
                  />
                  Add organization
                </Link>
              </li>
            )}
          </ul>
        </section>
      </nav>
    );
  }
}

export default connect(
  createSelector(
    state => state.settingsJournalList.journalIds,
    state => state.droplets,
    state => state.settingsOrganizationList.organizationIds,
    (journalIds, droplets, organizationIds) => {
      return {
        journals: journalIds
          .filter(id => id in droplets)
          .map(id => droplets[id]),
        organizations: organizationIds
          .map(id => droplets[id])
          .filter(Boolean)
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      };
    }
  ),
  {
    fetchSettingsJournalList,
    fetchSettingsOrganizationList
  }
)(SettingsPanel);
