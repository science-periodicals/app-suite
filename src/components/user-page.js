import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import querystring from 'querystring';
import { createSelector } from 'reselect';
import { connect } from 'react-redux';
import capitalize from 'lodash/capitalize';
import Iconoclass from '@scipe/iconoclass';
import {
  Footer,
  AppLayout,
  AppLayoutHeader,
  AppLayoutMiddle,
  AppLayoutFooter,
  Card,
  Header,
  BemTags,
  RdfaPersonOrOrganization,
  RdfaOrganization,
  UserBadgeMenu,
  MenuCardItem,
  UserContactSheet,
  Value,
  SubjectEditor,
  RE_TWITTER,
  RE_FACEBOOK,
  RE_ORCID,
  StartMenu,
  API_LABELS,
  JournalBadge,
  Span,
  Hyperlink
} from '@scipe/ui';
import { xhr } from '@scipe/librarian';
import { getId, unrole, arrayify, unprefix } from '@scipe/jsonld';
import { fetchProfile } from '../actions/user-action-creators';
import ConnectedUserBadgeMenu from './connected-user-badge-menu';
import { getUserRolesSummary } from '../utils/user-utils';
import Loading from './loading';

// TODO featured articles (new settings step in public profile settings)

class UserPage extends React.Component {
  static propTypes = {
    location: PropTypes.object.isRequired,
    match: PropTypes.object.isRequired,

    // redux
    user: PropTypes.object,
    profile: PropTypes.object,
    fetchProfile: PropTypes.func.isRequired
  };

  static defaultProps = {
    profile: {}
  };

  constructor(props) {
    super(props);

    this.state = {
      roles: [],
      error: null,
      isFetchingRoles: false
    };
  }

  componentDidMount() {
    this._isMounted = true;
    const { match, fetchProfile } = this.props;

    window.scrollTo(0, 0);
    fetchProfile(`user:${match.params.userId}`);
    this.fetchRoles();
  }

  componentDidUpdate(prevProps) {
    const { match, fetchProfile } = this.props;
    if (prevProps.match.params.userId !== match.params.userId) {
      fetchProfile(`user:${match.params.userId}`);
      this.setState({ roles: [] }, () => {
        this.fetchRoles();
      });
    }
  }

  fetchRoles() {
    const { match } = this.props;
    if (this.xhr) {
      this.xhr.abort();
    }

    const r = xhr({
      url: `/role?user=${match.params.userId}`,
      method: 'GET',
      json: true
    });

    this.xhr = r.xhr;

    this.setState({ error: null, isFetchingRoles: true }, () => {
      r.then(({ body }) => {
        this.setState({
          error: null,
          isFetchingRoles: false,
          roles: arrayify(body.itemListElement).map(itemList => itemList.item)
        });
      }).catch(err => {
        if (this._isMounted) {
          this.setState({ error: err, isFetchingRoles: false });
        }
      });
    });
  }

  handleTogglePanel = e => {
    this.setState({ isLeftPanelExpanded: !this.state.isLeftPanelExpanded });
  };

  render() {
    const { profile, location, match } = this.props;
    const { roles, isFetchingRoles } = this.state;
    const data = getUserRolesSummary(roles);

    const query = querystring.parse(location.search.substring(1));

    const bem = BemTags();

    const username = match.params.userId;

    const subjects = arrayify(profile.knowsAbout).filter(tag => {
      const tagId = getId(tag);
      return tagId && tagId.startsWith('subjects:');
    });
    const semanticTagsMap = subjects.reduce((semanticTagsMap, semanticTag) => {
      semanticTagsMap[getId(semanticTag)] = semanticTag;
      return semanticTagsMap;
    }, {});

    const affiliations = arrayify(profile.affiliation);

    const links = arrayify(profile.url)
      .concat(arrayify(profile.sameAs))
      .filter(Boolean);

    return (
      <AppLayout
        leftExpanded={false}
        rightExpanded={false}
        className={bem`user-page`}
      >
        <AppLayoutHeader>
          <Header
            showHamburger={false}
            onClickHamburger={this.handleTogglePanel}
            crumbs={getCrumbs(location, match)}
            userBadgeMenu={<ConnectedUserBadgeMenu />}
            startMenu={<StartMenu />}
            homeLink={{
              to: {
                pathname: '/',
                search: query.hostname
                  ? `hostname=${query.hostname}`
                  : undefined
              }
            }}
            showHome={true}
            logoLink={{
              to: {
                pathname: '/',
                search: query.hostname
                  ? `hostname=${query.hostname}`
                  : undefined
              }
            }}
          />
        </AppLayoutHeader>

        <AppLayoutMiddle widthMode="center">
          <Card className="user-page__content-card">
            <article
              className="user-page__content"
              data-test-ready={'true' /* We hard code true given SSR */}
            >
              <header className="user-page__content__header">
                <UserBadgeMenu
                  userId={`user:${username}`}
                  size={24}
                  align="left"
                  displayName={true}
                  portal={true}
                >
                  <MenuCardItem>
                    <UserContactSheet role={profile} />
                  </MenuCardItem>
                </UserBadgeMenu>

                <RdfaPersonOrOrganization
                  object={profile}
                  className="user-page__content__title"
                />
              </header>

              {!!profile.description && (
                <section className="user-page__content__section">
                  <h3 className="user-page__content__sub-title">Bio</h3>
                  <Value>{profile.description}</Value>
                </section>
              )}

              {!!subjects.length && (
                <section className="user-page__content__section">
                  <h3 className="user-page__content__sub-title">Subjects</h3>

                  <SubjectEditor
                    entity={profile}
                    semanticTagsMap={semanticTagsMap}
                    disabled={true}
                    readOnly={true}
                  />
                </section>
              )}

              {!!affiliations.length && (
                <section className="user-page__content__section">
                  <h3 className="user-page__content__sub-title">
                    Affiliations
                  </h3>
                  <ul className="sa__clear-list-styles user-page__content__list">
                    {affiliations.map(affiliation => (
                      <li
                        key={getId(affiliation)}
                        className="user-page__content__list-item"
                      >
                        <Iconoclass iconName="locationCity" size="16px" />
                        <RdfaOrganization
                          object={unrole(affiliation, 'affiliation')}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {!!links.length && (
                <section className="user-page__content__section">
                  <h3 className="user-page__content__sub-title">Links</h3>
                  <ul className="sa__clear-list-styles user-page__content__list">
                    {links.map(link => (
                      <li key={link} className="user-page__content__list-item">
                        <Iconoclass
                          iconName={
                            RE_FACEBOOK.test(link)
                              ? 'socialFacebook'
                              : RE_TWITTER.test(link)
                              ? 'socialTwitter'
                              : RE_ORCID.test(link)
                              ? 'orcid'
                              : 'link'
                          }
                          size="16px"
                        />
                        <a href={link}>{link}</a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="user-page__content__section">
                <h3 className="user-page__content__sub-title">Roles</h3>

                {['editorFor', 'reviewerFor', 'producerFor', 'authorFor'].some(
                  p => data[p] && data[p].length
                ) ? (
                  ['editorFor', 'reviewerFor', 'producerFor', 'authorFor']
                    .filter(p => data[p] && data[p].length)
                    .map(p => (
                      <Fragment key={p}>
                        <h4 className="user-page__role-title">
                          <Iconoclass
                            iconName={`role${capitalize(p.replace('For', ''))}`}
                          />
                          {capitalize(p.replace('For', ''))}
                        </h4>
                        <ul className="sa__clear-list-styles user-page__content__list">
                          {data[p].map(({ journal, subRoleNames }) => (
                            <li key={getId(journal)}>
                              <span className="user-page__journal-badge-title">
                                <JournalBadge journal={journal} link={true} />{' '}
                                <Hyperlink
                                  page="journal"
                                  reset={true}
                                  periodical={journal}
                                >
                                  <Span tagName="span">
                                    {journal.name ||
                                      journal.alternateName ||
                                      unprefix(getId(journal))}
                                  </Span>
                                </Hyperlink>
                              </span>
                              {!!subRoleNames.length && (
                                <ul className="user-page__user-role-list">
                                  {subRoleNames.map(subRoleName => (
                                    <li key={subRoleName}>{subRoleName}</li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      </Fragment>
                    ))
                ) : (
                  <Fragment>
                    {isFetchingRoles ? <Loading /> : <p>No roles yet.</p>}
                  </Fragment>
                )}
              </section>

              {!!data.activity && (
                <section className="user-page__content__section">
                  <h3 className="user-page__content__sub-title">Activities</h3>

                  <table className="user-page__activity-table">
                    <thead className="user-page__activity-table__header">
                      <tr className="user-page__activity-table__header__row">
                        <th className="user-page__activity-table__header__cell">
                          Action
                        </th>
                        <th className="user-page__activity-table__header__cell">
                          Count
                        </th>
                        <th
                          colSpan="2"
                          className="user-page__activity-table__header__cell"
                        >
                          On Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="user-page__activity-table__body">
                      {data.activity.map(({ type, count, onTimeCount }) => (
                        <tr
                          key={type}
                          className="user-page__activity-table__body__row"
                        >
                          <td className="user-page__activity-table__body__cell">
                            {API_LABELS[type]}
                          </td>
                          <td className="user-page__activity-table__body__cell">
                            {count}
                          </td>
                          <td className="user-page__activity-table__body__cell">
                            {Math.round((onTimeCount / count) * 100)}%
                          </td>
                          <td className="user-page__activity-table__body__cell">
                            <div className="user-page__activity-table__status-icon-container">
                              <Iconoclass
                                iconName={`status${
                                  onTimeCount / count < 0.33
                                    ? 'Warning'
                                    : onTimeCount / count < 0.66
                                    ? 'Error'
                                    : 'Pass'
                                }`}
                                size="16px"
                                color={`rgb(${255 -
                                  (onTimeCount / count) * 255}, 128, 128)`}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}
            </article>
          </Card>
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
    (state, props) => state.droplets[`user:${props.match.params.userId}`],
    profile => {
      return {
        profile
      };
    }
  ),
  {
    fetchProfile
  }
)(UserPage);

function getCrumbs(location = {}, match = {}) {
  return [
    {
      key: 'profile',
      to: location.pathname,
      children: match.params && match.params.userId
    }
  ];
}
