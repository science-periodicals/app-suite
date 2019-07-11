import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { getId } from '@scipe/jsonld';
import { createId } from '@scipe/librarian';
import {
  OrganizationBadge,
  PaperButton,
  PaperInput,
  PaperSlug,
  ControlPanel,
  Header,
  Footer,
  AppLayout,
  AppLayoutHeader,
  AppLayoutMiddle,
  AppLayoutFooter,
  StartMenu
} from '@scipe/ui';
import {
  createOrganization,
  resetCreateOrganizationStatus
} from '../actions/organization-action-creators';
import ConnectedUserBadgeMenu from './connected-user-badge-menu';

export default connect(
  state => {
    return {
      error: state.createOrganizationStatus.error,
      status: state.createOrganizationStatus.status,
      createOrganizationAction:
        state.createOrganizationStatus.createOrganizationAction,
      user: state.user
    };
  },
  {
    createOrganization,
    resetCreateOrganizationStatus
  }
)(
  class CreateOrganization extends PureComponent {
    static propTypes = {
      history: PropTypes.object.isRequired,
      location: PropTypes.object.isRequired,
      disabled: PropTypes.bool.isRequired,
      createOrganization: PropTypes.func.isRequired,
      status: PropTypes.oneOf(['active', 'success', 'error']),
      error: PropTypes.instanceOf(Error),
      createOrganizationAction: PropTypes.object,
      resetCreateOrganizationStatus: PropTypes.func.isRequired,
      user: PropTypes.object.isRequired
    };

    constructor(props) {
      super(props);

      this.state = {
        slug:
          (props.status === 'error' &&
            props.createOrganizationAction &&
            getId(props.createOrganizationAction.result)) ||
          '',
        name:
          (props.status === 'error' &&
            props.createOrganizationAction &&
            props.createOrganizationAction.result.name) ||
          ''
      };
      this.handleChange = this.handleChange.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
      this.handleCancel = this.handleCancel.bind(this);
    }

    componentWillReceiveProps(nextProps) {
      if (nextProps.status === 'success' && this.props.status === 'active') {
        this.setState({
          slug: '',
          name: ''
        });
      }
    }

    handleChange(e) {
      const { name, value } = e.target;
      this.setState({ [name]: value });
    }

    preventSubmit(e) {
      if (e.keyCode === 13) e.preventDefault();
    }

    handleCancel(e) {
      e.preventDefault();
      this.props.history.goBack();
      this.props.resetCreateOrganizationStatus();
      this.setState({
        slug: '',
        name: ''
      });
    }

    handleSubmit(e) {
      e.preventDefault();
      const { history } = this.props;
      const { name, slug } = this.state;

      const org = {
        '@id': createId('org', slug)['@id'],
        '@type': 'Organization',
        name
      };

      this.props.createOrganization(org, history);
    }

    render() {
      let { error, status, disabled: _disabled } = this.props;
      const disabled = _disabled || status === 'active';
      const { name, slug } = this.state;
      const invalid = !name || !slug;

      return (
        <AppLayout leftExpanded={false} rightExpanded={false}>
          <AppLayoutHeader>
            <Header
              crumbs={[
                { key: 'new-organization', children: 'New organization' }
              ]}
              userBadgeMenu={<ConnectedUserBadgeMenu />}
              homeLink={{ to: { pathname: '/' } }}
              showHome={true}
              logoLink={{ to: { pathname: '/' } }}
              startMenu={<StartMenu />}
            />
          </AppLayoutHeader>

          <AppLayoutMiddle maxContentWidth="1024px" widthMode="maximize">
            <div className="create-organization">
              <form onSubmit={this.preventSubmit}>
                <div className="create-organization__form">
                  <fieldset>
                    <legend>Create an organization</legend>
                    <div className="create-organization__organization-badge">
                      <OrganizationBadge organization={name} />
                    </div>

                    <PaperSlug
                      className="create-organization__slug-input"
                      name="slug"
                      large={true}
                      autoComplete="off"
                      label="Organization Slug"
                      value={slug}
                      onChange={this.handleChange}
                    />

                    <PaperInput
                      className="create-organization__name-input"
                      name="name"
                      label="Organization Name"
                      autoComplete="off"
                      onKeyDown={this.preventSubmit}
                      required
                      large={true}
                      value={name}
                      onChange={this.handleChange}
                      disabled={disabled}
                    />
                  </fieldset>

                  <ControlPanel error={error}>
                    <PaperButton
                      onClick={this.handleCancel}
                      disabled={
                        status ===
                        'active' /* in readonly mode we need to be able to cancel */
                      }
                    >
                      Cancel
                    </PaperButton>
                    <PaperButton
                      onClick={this.handleSubmit}
                      disabled={disabled || invalid}
                      type="submit"
                    >
                      {disabled
                        ? 'Creating organization'
                        : 'Create organization'}
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
);
