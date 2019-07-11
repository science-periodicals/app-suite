import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import pickBy from 'lodash/pickBy';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId } from '@scipe/jsonld';
import {
  JournalBadge,
  PaperButton,
  PaperTextarea,
  PaperInput,
  PaperSubdomain,
  OrganizationAutocomplete,
  ControlPanel,
  Header,
  Footer,
  AppLayout,
  AppLayoutHeader,
  AppLayoutMiddle,
  AppLayoutFooter,
  StartMenu
} from '@scipe/ui';
import { parse } from 'url';
import {
  createJournal,
  resetCreateJournalStatus
} from '../actions/journal-action-creators';
import { fetchSettingsOrganizationList } from '../actions/settings-action-creators';
import ConnectedUserBadgeMenu from './connected-user-badge-menu';

class CreateJournal extends PureComponent {
  static propTypes = {
    user: PropTypes.object.isRequired,
    disabled: PropTypes.bool.isRequired,
    createJournal: PropTypes.func.isRequired,
    fetchSettingsOrganizationList: PropTypes.func.isRequired,
    status: PropTypes.oneOf(['active', 'success', 'error']),
    error: PropTypes.instanceOf(Error),
    createPeriodicalAction: PropTypes.object,
    organizations: PropTypes.array,
    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    resetCreateJournalStatus: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);

    const uri =
      props.createPeriodicalAction && props.createPeriodicalAction.result.url;
    this.state = {
      name:
        (props.status === 'error' &&
          props.createPeriodicalAction &&
          props.createPeriodicalAction.result.name) ||
        '',
      description:
        (props.status === 'error' &&
          props.createPeriodicalAction &&
          props.createPeriodicalAction.result.description) ||
        '',
      organization: null,
      subdomain:
        (props.status === 'error' &&
          (parse(uri || '').hostname || '').replace(/\.sci\.pe$/, '')) ||
        '',
      subdomainTouched: false
    };
  }

  componentDidMount() {
    this.props.fetchSettingsOrganizationList();
    this.resetState();
  }

  componentDidUpdate(prevProps) {
    if (this.props.status === 'success' && prevProps.status === 'active') {
      this.resetState();
    }
  }

  resetState() {
    this.setState({
      name: '',
      description: '',
      subdomain: '',
      organization: null,
      subdomainTouched: false
    });
  }

  handleChange = e => {
    let { name, value } = e.target;
    this.setState({ [name]: value });
    if (name === 'subdomain') {
      this.setState({ subdomainTouched: true });
    }
  };

  handleOrgChange = (value, organization) => {
    this.setState({ organization });
  };

  preventSubmit(e) {
    if (e.keyCode === 13) e.preventDefault();
  }

  handleCancel = e => {
    e.preventDefault();
    this.props.history.goBack();
    this.props.resetCreateJournalStatus();
    this.resetState();
  };

  handleFocus = e => {
    if (
      !this.state.subdomainTouched &&
      this.state.name &&
      this.state.name.length < 50 &&
      !this.state.subdomain
    ) {
      // auto suggest a slug based on the name...
      const subdomain = this.paperSubdomain.resetValue(this.state.name);
      this.setState({
        subdomain,
        subdomainTouched: true
      });
    }
  };

  handleSubmit = e => {
    e.preventDefault();
    const { createJournal, history } = this.props;
    const { name, description, subdomain, organization } = this.state;

    const periodical = pickBy({
      '@id': `journal:${subdomain.trim()}`,
      '@type': 'Periodical',
      name: name && name.trim(),
      description: description && description.trim(),
      publisher: getId(organization)
    });

    createJournal(periodical, history);
  };

  render() {
    const { error, status, organizations, disabled: _disabled } = this.props;
    const disabled = _disabled || status === 'active';
    const { name, description, subdomain, organization } = this.state;

    return (
      <AppLayout leftExpanded={false} rightExpanded={false}>
        <AppLayoutHeader>
          <Header
            crumbs={[{ key: 'new', children: 'New journal' }]}
            userBadgeMenu={<ConnectedUserBadgeMenu />}
            homeLink={{ to: { pathname: '/' } }}
            showHome={true}
            logoLink={{ to: { pathname: '/' } }}
            startMenu={<StartMenu />}
          />
        </AppLayoutHeader>

        <AppLayoutMiddle maxContentWidth="1024px" widthMode="maximize">
          <div className="create-journal">
            <form onSubmit={this.preventSubmit}>
              <div className="create-journal__form">
                <fieldset>
                  <div className="create-journal__form-header">
                    <legend>Start a new journal</legend>
                    <div className="create-journal__journal-badge">
                      <JournalBadge
                        journal={{
                          name,
                          url: subdomain && `https://${subdomain}.sci.pe`
                        }}
                      />
                    </div>
                  </div>
                  <PaperInput
                    name="name"
                    label="Journal Name"
                    autoComplete="off"
                    onKeyDown={this.preventSubmit}
                    required
                    large={true}
                    value={name}
                    onChange={this.handleChange}
                    disabled={disabled}
                    className="create-journal__name-input"
                  />
                  <PaperTextarea
                    name="description"
                    label="Journal Description"
                    value={description}
                    large={true}
                    onChange={this.handleChange}
                    disabled={disabled}
                    className="create-journal__description-input"
                  />
                  <OrganizationAutocomplete
                    name="publisher"
                    label="Publishing Organization"
                    items={organizations}
                    large={true}
                    onSubmit={this.handleOrgChange}
                    disabled={disabled}
                    className="create-journal__publisher-input"
                  />
                  <PaperSubdomain
                    ref={el => {
                      this.paperSubdomain = el;
                    }}
                    name="subdomain"
                    onFocus={this.handleFocus}
                    large={true}
                    onKeyDown={this.preventSubmit}
                    value={subdomain}
                    onChange={this.handleChange}
                    disabled={disabled}
                    autoComplete="off"
                    required
                  />
                </fieldset>

                <ControlPanel error={error}>
                  <PaperButton
                    onClick={this.handleCancel}
                    disabled={
                      status ===
                      'active' /* in readOnly mode we can still cancel */
                    }
                  >
                    Cancel
                  </PaperButton>
                  <PaperButton
                    onClick={this.handleSubmit}
                    disabled={disabled || !subdomain || !organization}
                    type="submit"
                  >
                    {disabled ? 'Creating Journal' : 'Create Journal'}
                  </PaperButton>
                </ControlPanel>
              </div>
            </form>
            {/* TODO fix footer instead maybe with: http://ryanfait.com/sticky-footer/ */}
            <div className="dashboard-body-spacer" />
          </div>
        </AppLayoutMiddle>

        <AppLayoutFooter>
          <Footer padding="small" sticky={true} hideCopyright={true} />
        </AppLayoutFooter>
      </AppLayout>
    );
  }
}

export default connect(
  createSelector(
    state => state.createJournalStatus,
    state => state.settingsOrganizationList.organizationIds,
    state => state.droplets,
    (createJournalStatus, organizationIds, droplets) => {
      return {
        error: createJournalStatus.error,
        status: createJournalStatus.status,
        createPeriodicalAction: createJournalStatus.createPeriodicalAction,
        organizations: organizationIds
          .map(id => droplets[id])
          .filter(Boolean)
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      };
    }
  ),
  {
    createJournal,
    fetchSettingsOrganizationList,
    resetCreateJournalStatus
  }
)(CreateJournal);
