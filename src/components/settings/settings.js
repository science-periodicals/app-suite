import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { Route, Switch, Redirect } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  BemTags,
  Card,
  Footer,
  AppLayout,
  AppLayoutHeader,
  AppLayoutLeft,
  AppLayoutMiddle,
  AppLayoutFooter,
  Header,
  StartMenu
} from '@scipe/ui';
import SettingsProfile from './settings-profile';
import SettingsEmail from './settings-email';
import SettingsPassword from './settings-password';
import SettingsOrganization from './settings-organization';
import SettingsJournal from './settings-journal';
import ConnectedUserBadgeMenu from '../connected-user-badge-menu';
import SettingsPanel from '../settings/settings-panel';
import Iconoclass from '@scipe/iconoclass';
import withShowPanel from '../../hoc/with-show-panel';

class Settings extends Component {
  static propTypes = {
    match: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    user: PropTypes.object.isRequired,
    disabled: PropTypes.bool.isRequired,

    // withShowPanel HoC
    showPanel: PropTypes.bool.isRequired,
    onPanelClick: PropTypes.func.isRequired,
    onTogglePanel: PropTypes.func.isRequired,

    // Redux
    screenWidth: PropTypes.string
  };

  componentDidMount() {
    window.scrollTo(0, 0);
  }

  render() {
    const bem = BemTags();
    const {
      location,
      disabled,
      user,
      match,
      showPanel,
      onPanelClick,
      onTogglePanel
    } = this.props;

    return (
      <AppLayout leftExpanded={showPanel} rightExpanded={false}>
        <AppLayoutHeader>
          <Header
            showHamburger={true}
            onClickHamburger={onTogglePanel}
            crumbs={getCrumbs(location)}
            userBadgeMenu={<ConnectedUserBadgeMenu />}
            homeLink={{ to: { pathname: '/' } }}
            showHome={true}
            logoLink={{ to: { pathname: '/' } }}
            startMenu={<StartMenu />}
          />
          <Helmet>
            <title>sci.pe • settings</title>
          </Helmet>
        </AppLayoutHeader>
        <AppLayoutMiddle widthMode="maximize">
          <section className={bem`settings`}>
            <AppLayoutLeft backgroundOnDesktop={false}>
              <SettingsPanel
                user={user}
                disabled={disabled}
                onPanelClick={onPanelClick}
              />
            </AppLayoutLeft>

            <div className={bem`body`}>
              <Card className={bem`card`}>
                <Switch>
                  <Route
                    path={`${match.url}/profile`}
                    exact={true}
                    render={props => <Redirect to={`/settings/profile/bio`} />}
                  />

                  <Route
                    path={`${match.url}/profile/:category(bio|subjects|affiliations)`}
                    render={props => (
                      <SettingsProfile
                        {...props}
                        user={user}
                        disabled={disabled}
                      />
                    )}
                  />
                  <Route
                    path={`${match.url}/contact-points`}
                    render={props => (
                      <SettingsEmail
                        {...props}
                        user={user}
                        disabled={disabled}
                      />
                    )}
                  />
                  <Route
                    path={`${match.url}/password`}
                    render={props => (
                      <SettingsPassword
                        {...props}
                        user={user}
                        disabled={disabled}
                      />
                    )}
                  />

                  <Route
                    path={`${match.url}/journal/:journalId`}
                    exact={true}
                    render={props => (
                      <Redirect
                        to={`/settings/journal/${props.match.params.journalId}/journal`}
                      />
                    )}
                  />

                  <Route
                    exact={true}
                    path={`${match.url}/journal/:journalId/:category(journal|staff|workflows|types|issues|articles|rfas|access|domains|style)`}
                    render={props => (
                      <SettingsJournal
                        {...props}
                        user={user}
                        disabled={disabled}
                      />
                    )}
                  />

                  <Route
                    path={`${match.url}/organization/:organizationId`}
                    exact={true}
                    render={props => (
                      <Redirect
                        to={`/settings/organization/${props.match.params.organizationId}/organization`}
                      />
                    )}
                  />

                  <Route
                    path={`${match.url}/organization/:organizationId/:category(organization|contact-points|admins|services|payments|discounts|billing)`}
                    render={props => (
                      <SettingsOrganization
                        {...props}
                        user={user}
                        disabled={disabled}
                      />
                    )}
                  />
                  <Redirect to="/settings/profile" />
                </Switch>
              </Card>
            </div>
          </section>
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
    state => state.screenWidth,
    screenWidth => {
      return {
        screenWidth
      };
    }
  )
)(withShowPanel(Settings));

function getCrumbs(location) {
  const crumbs = [
    {
      key: 'settings',
      to: location.pathname,
      children: 'Settings'
    }
  ];

  if (location.pathname && location.pathname.match(/settings\/journal/)) {
    const [category, journalSlug] = location.pathname.split('/').reverse();

    crumbs.push({
      key: 'journal',
      to: location.pathname,
      children: 'Journal'
    });

    crumbs.push({
      key: 'journalName',
      to: location.pathname,
      children: journalSlug
    });

    crumbs.push({
      key: 'category',
      to: location.pathname,
      children: category
    });
  } else if (
    location.pathname &&
    location.pathname.match(/settings\/organization/)
  ) {
    const [category, organizationSlug] = location.pathname.split('/').reverse();

    crumbs.push({
      key: 'organization',
      to: location.pathname,
      children: 'Organization'
    });

    crumbs.push({
      key: 'organizationSlug',
      to: location.pathname,
      children: organizationSlug
    });

    crumbs.push({
      key: 'category',
      to: location.pathname,
      children: category
    });
  } else if (
    location.pathname &&
    location.pathname.match(/settings\/profile/)
  ) {
    crumbs.push({
      key: 'profile',
      to: location.pathname,
      children: 'Profile'
    });
  } else if (location.pathname && location.pathname.match(/settings\/email/)) {
    crumbs.push({ key: 'email', to: location.pathname, children: 'Email' });
  }

  return crumbs;
}

export const StyleSection = ({ children, tagName }) => {
  const bem = BemTags('settings');
  const El = tagName || 'section';
  return <El className={bem`__section`}>{children}</El>;
};

StyleSection.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string
};

export const StyleGroup = ({ children, tagName }) => {
  const bem = BemTags('settings');
  const El = tagName || 'div';
  return <El className={bem`__group`}>{children}</El>;
};

StyleGroup.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string
};

export const StyleRow = ({ children, tagName }) => {
  const bem = BemTags('settings');
  const El = tagName || 'div';
  return <El className={bem`__row`}>{children}</El>;
};

StyleRow.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string
};

export const StyleSectionHeader = ({ children, tagName }) => {
  const bem = BemTags('settings');
  const El = tagName || 'div';
  return <El className={bem`__section-header`}>{children}</El>;
};

StyleSectionHeader.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string
};

export const StyleSectionTitle = ({ children, tagName }) => {
  const bem = BemTags('settings');
  const El = tagName || 'h3';
  return <El className={bem`__section-title`}>{children}</El>;
};

StyleSectionTitle.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string
};

export const StyleSectionSubTitle = ({ children, tagName }) => {
  const bem = BemTags('settings');
  const El = tagName || 'h3';
  return <El className={bem`__section-sub-title`}>{children}</El>;
};

StyleSectionSubTitle.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string
};

export const StyleSectionControls = ({ children, tagName }) => {
  const bem = BemTags('settings');
  const El = tagName || 'div';
  return <El className={bem`__section-controls`}>{children}</El>;
};

StyleSectionControls.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string
};

export const StyleModalBody = ({ children, tagName }) => {
  const bem = BemTags('settings');
  const El = tagName || 'div';
  return <El className={bem`__modal-body`}>{children}</El>;
};

StyleModalBody.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string
};

/* form sets are list of the descrete form instances like workflows, publication types etc */
export const StyleFormSetList = ({ children, tagName }) => {
  const bem = BemTags('settings');
  const El = tagName || 'ul';
  return <El className={bem`__form-set-list`}>{children}</El>;
};

StyleFormSetList.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string
};

export const StyleFormSetOrderedList = ({ children, tagName }) => {
  const bem = BemTags('settings');
  const El = tagName || 'ol';
  return <El className={bem`__form-set-ordered-list`}>{children}</El>;
};

StyleFormSetOrderedList.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string
};

export const StyleFormSetListItem = ({
  children,
  tagName,
  active,
  ...others
}) => {
  const bem = BemTags('settings');
  const El = tagName || 'li';
  return (
    <El
      className={bem`__form-set-list-item ${active ? '--active' : ''}`}
      {...others}
    >
      {children}
    </El>
  );
};

StyleFormSetListItem.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string,
  active: PropTypes.bool
};

export const StyleFormSetListItemTitle = ({ children, tagName }) => {
  const bem = BemTags('settings');
  const El = tagName || 'span';
  return <El className={bem`__form-set-list-item-title`}>{children}</El>;
};

StyleFormSetListItemTitle.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string
};

export const StyleFormSetListItemGroup = ({
  children,
  tagName,
  align,
  ...props
}) => {
  const bem = BemTags('settings');
  const El = tagName || 'div';
  return (
    <El
      {...props}
      className={bem`__form-set-list-item-group ${align && '--align-' + align}`}
    >
      {children}
    </El>
  );
};

StyleFormSetListItemGroup.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string,
  align: PropTypes.string
};

export const StyleFormSet = ({ children, tagName }) => {
  const bem = BemTags('settings');
  const El = tagName || 'div';
  return <El className={bem`__form-set`}>{children}</El>;
};

StyleFormSet.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string
};

export const StyleLegend = ({ children, tagName }) => {
  const bem = BemTags('settings');
  const El = tagName || 'div';
  return <El className={bem`__legend`}>{children}</El>;
};

StyleLegend.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string
};

export const StyleValidatedInput = ({ children, tagName }) => {
  const bem = BemTags('settings');
  const El = tagName || 'div';
  return (
    <El className={bem`__validated-input`}>
      {children}
      <Iconoclass
        iconName="check"
        className={bem`__validated-input__check`}
        size="18px"
      />
    </El>
  );
};

StyleValidatedInput.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string
};

export const StyleNoticeContent = ({ children }) => {
  const bem = BemTags('settings');
  return <div className={bem`__notice-content`}>{children}</div>;
};

StyleNoticeContent.propTypes = {
  children: PropTypes.any
};

export const StyleNoticeTaskList = ({ children }) => {
  const bem = BemTags('settings');
  return <ul className={bem`__notice-task-list`}>{children}</ul>;
};

StyleNoticeTaskList.propTypes = {
  children: PropTypes.any
};
