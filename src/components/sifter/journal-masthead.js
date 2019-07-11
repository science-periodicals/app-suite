import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { normalizeText } from 'web-verse';
import pluralize from 'pluralize';
import querystring from 'querystring';
import omit from 'lodash/omit';
import { Helmet } from 'react-helmet-async';
import Iconoclass from '@scipe/iconoclass';
import {
  helmetify,
  getAgentId,
  getAgent,
  getActiveRoles,
  CONTACT_POINT_EDITORIAL_OFFICE,
  CONTACT_POINT_GENERAL_INQUIRY
} from '@scipe/librarian';
import {
  unrole,
  arrayify,
  unprefix,
  getId,
  getValue,
  textify
} from '@scipe/jsonld';
import {
  UserContactSheet,
  BemTags,
  getAgentName,
  Card,
  Div,
  Value,
  UserBadgeMenu,
  MenuCardItem,
  Divider,
  SubjectEditor,
  RdfaOrganization,
  PaperButton
} from '@scipe/ui';
import { isEditorInChief } from '../../utils/graph-utils';
import ApplyModal from '../apply-modal';
import StartSubmissionButton from '../start-submission-button';

// Note apply modal is URL driven so that we can have good ?next link for login
// and register with a purpose

export default class JournalMasthead extends PureComponent {
  static propTypes = {
    user: PropTypes.object,
    acl: PropTypes.object.isRequired,
    journal: PropTypes.object,
    droplets: PropTypes.object,
    history: PropTypes.object,
    location: PropTypes.object
  };

  static defaultProps = {
    journal: {},
    droplets: {}
  };

  handleOpenApplyModal = e => {
    const { location, history } = this.props;
    const query = querystring.parse(location.search.substring(1));

    history.push({
      pathname: location.pathname,
      search: `?${querystring.stringify(
        Object.assign({}, query, { join: true })
      )}`
    });
  };

  handleCloseApplyModal = e => {
    const { location, history } = this.props;
    const query = querystring.parse(location.search.substring(1));
    // delete `join` qs on unmout
    history.push({
      pathname: location.pathname,
      search: `?${querystring.stringify(omit(query, ['join']))}`
    });
  };

  componentDidUpdate(prevProps) {
    const { location, history, journal } = this.props;
    const query = querystring.parse(location.search.substring(1));
    if (
      query.join &&
      getId(prevProps.journal) &&
      getId(journal) !== getId(prevProps.journal)
    ) {
      history.push({
        pathname: location.pathname,
        search: `?${querystring.stringify(omit(query, ['join']))}`
      });
    }
  }

  render() {
    const { user, journal, droplets, acl, location } = this.props;
    const query = querystring.parse(location.search.substring(1));
    const isApplyModalOpen = String(query.join) === 'true';

    const sortedStaffListByRoleName = getSortedStaffListByRoleName(
      journal,
      droplets
    );

    const acceptsSubmission = acl.checkPermission(
      { '@type': 'Audience', audienceType: 'public' },
      'CreateGraphPermission'
    );

    const helmet = helmetify(journal, {
      defaultImg: '/favicon/alt-submark-favicon/android-chrome-512x512.png'
    });

    const bem = BemTags();
    return (
      <div className={bem`journal-masthead`}>
        <Helmet>
          {helmet.title && <title>{`${helmet.title} • Staff`}</title>}
          {helmet.meta.map(attrMap => (
            <meta key={attrMap.name || attrMap.content} {...attrMap} />
          ))}
        </Helmet>

        <Card className={bem`__card`}>
          <div className={bem`__content`}>
            <div className={bem`__title-container`}>
              <h2 className={bem`journal-title`}>
                Journal staff and Editorial board
              </h2>
              <PaperButton raised={true} onClick={this.handleOpenApplyModal}>
                Join
              </PaperButton>
            </div>

            {/* Intro for the staff */}
            {!!journal.editorialBoardDescription && (
              <Div className={`${bem`__description`} sa__sans-body-user-type`}>
                {journal.editorialBoardDescription}
              </Div>
            )}

            {['editor', 'producer', 'reviewer']
              .filter(roleName => sortedStaffListByRoleName[roleName])
              .map(roleName =>
                sortedStaffListByRoleName[roleName].map(staffList => {
                  const groupTitle = textify(
                    staffList[0].name || staffList[0].roleName
                  );
                  return (
                    <div
                      className={bem`__staff-group`}
                      key={getValue(staffList[0].name || staffList[0].roleName)}
                    >
                      <h3 className={bem`__staff-group-title`}>
                        {pluralize(
                          groupTitle,
                          groupTitle.endsWith('office') ||
                            groupTitle.endsWith('desk')
                            ? 1
                            : staffList.length
                        )}
                      </h3>
                      <div className={bem`__staff-group-members`}>
                        {staffList.map(role => {
                          const agent = getAgent(role);
                          const semanticTagsMap = arrayify(role.about)
                            .filter(tag => {
                              const tagId = getId(tag);
                              return tagId && tagId.startsWith('subjects:');
                            })
                            .reduce((semanticTagsMap, semanticTag) => {
                              semanticTagsMap[getId(semanticTag)] = semanticTag;
                              return semanticTagsMap;
                            }, {});

                          const isEditorialOffice = arrayify(
                            role.roleContactPoint
                          ).some(
                            contactPoint =>
                              contactPoint.contactType ===
                              CONTACT_POINT_EDITORIAL_OFFICE
                          );

                          const isGeneralInquiry = arrayify(
                            role.roleContactPoint
                          ).some(
                            contactPoint =>
                              contactPoint.contactType ===
                              CONTACT_POINT_GENERAL_INQUIRY
                          );

                          const affiliations = arrayify(agent.affiliation).map(
                            affiliation => unrole(affiliation, 'affiliation')
                          );

                          return (
                            <div
                              key={getId(role) || getAgentId(role)}
                              className={bem`__staff-group-member`}
                            >
                              <div className={bem`__staff-name`}>
                                <UserBadgeMenu
                                  statusIconName={
                                    isEditorialOffice || isGeneralInquiry
                                      ? 'email'
                                      : undefined
                                  }
                                  userId={getAgentId(role)}
                                  roleName={role.roleName}
                                  subRoleName={role.name}
                                  size={24}
                                  align="left"
                                  displayName={true}
                                  displayRoleName={true}
                                  forceResetSubdomain={true}
                                  portal={true}
                                >
                                  <MenuCardItem>
                                    <UserContactSheet role={role} />
                                  </MenuCardItem>
                                </UserBadgeMenu>
                                <Value className={bem`__staff-name-text`}>
                                  {getAgentName(
                                    role,
                                    role.name || role.roleName
                                  )}
                                </Value>
                              </div>

                              {!!(role.description || agent.description) && (
                                <Fragment>
                                  <Divider size={2} />
                                  <div className={bem`__group`}>
                                    <Value
                                      className={bem`__text-block${
                                        role.description ? ' --pre' : ''
                                      }`}
                                      tagName={role.description ? 'pre' : 'div'}
                                    >
                                      {role.description || agent.description}
                                    </Value>
                                  </div>
                                </Fragment>
                              )}

                              {!!affiliations.length && (
                                <div className={bem`__group`}>
                                  <ul className="sa__clear-list-styles">
                                    {affiliations.map(affiliation => (
                                      <li
                                        key={getId(affiliation)}
                                        className={bem`__affiliation`}
                                      >
                                        <Iconoclass iconName="locationCity" />
                                        <RdfaOrganization
                                          object={affiliation}
                                        />
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {!!Object.keys(semanticTagsMap).length && (
                                <Fragment>
                                  <div className={bem`__push-down`} />
                                  <section
                                    className={bem`staff-group-member-subjects`}
                                  >
                                    <Divider size={2} />
                                    <h4 className={bem`__sub-title`}>
                                      Area of responsibility
                                    </h4>
                                    <div
                                      className={bem`__staff-group-member-tags`}
                                    >
                                      <SubjectEditor
                                        entity={role}
                                        semanticTagsMap={semanticTagsMap}
                                        disabled={true}
                                        readOnly={true}
                                      />
                                    </div>
                                  </section>
                                </Fragment>
                              )}

                              {acceptsSubmission && isEditorialOffice && (
                                <div className={bem`__staff-submit`}>
                                  <div className={bem`__button-container`}>
                                    <StartSubmissionButton
                                      user={user}
                                      journal={journal}
                                      reset={true}
                                      roleId={getId(role)}
                                    >
                                      Send Manuscript
                                    </StartSubmissionButton>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
          </div>
        </Card>

        {isApplyModalOpen && (
          <ApplyModal
            fromSubdomain={true}
            journal={journal}
            onClose={this.handleCloseApplyModal}
          />
        )}
      </div>
    );
  }
}

function getSortedStaffListByRoleName(journal, droplets) {
  const roles = getActiveRoles(journal)
    .filter(role => {
      return (
        role.roleName === 'editor' ||
        role.roleName === 'producer' ||
        role.roleName === 'reviewer'
      );
    })
    .map(role => {
      // hydrate with profile
      const p = role.roleName;
      const profile = droplets[getAgentId(role)];

      if (profile) {
        role = Object.assign({}, role, { [p]: profile });
        if (role.roleContactPoint) {
          role = Object.assign({}, role, {
            roleContactPoint: arrayify(role.roleContactPoint).map(
              contactPoint => {
                const contactPointId = getId(contactPoint);
                const hydrated = arrayify(profile.contactPoint).find(
                  contactPoint => getId(contactPoint) === contactPointId
                );
                return hydrated || contactPoint;
              }
            )
          });
        }
      }
      return role;
    });

  const byRoleNameAndTitle = roles.reduce((roleMap, role) => {
    if (!(role.roleName in roleMap)) {
      roleMap[role.roleName] = {};
    }

    const title = role.name || role.roleName;
    if (!(title in roleMap[role.roleName])) {
      roleMap[role.roleName][title] = [];
    }
    roleMap[role.roleName][title].push(role);

    return roleMap;
  }, {});

  // sort by title and name
  return Object.keys(byRoleNameAndTitle).reduce(
    (sortedStaffListByRoleName, roleName) => {
      sortedStaffListByRoleName[roleName] = Object.keys(
        byRoleNameAndTitle[roleName]
      )
        .sort((titleA, titleB) => {
          // sort titles so that EiC are first and reviewers last
          titleA = normalizeText(titleA)
            .toLowerCase()
            .trim();
          titleB = normalizeText(titleB)
            .toLowerCase()
            .trim();
          if (isEditorInChief(titleA) && isEditorInChief(titleB)) {
            return titleA.localeCompare(titleB);
          } else if (isEditorInChief(titleA) && !isEditorInChief(titleB)) {
            return -1;
          } else if (isEditorInChief(titleB) && !isEditorInChief(titleA)) {
            return 1;
          } else {
            return titleA.localeCompare(titleB);
          }
        })
        .map(title => {
          return byRoleNameAndTitle[roleName][title]
            .map(role => {
              // hydrate
              // TODO hydrate roleAffiliation from profile
              const agentId = getAgentId(role);
              const droplet = droplets[agentId];
              if (!droplet) {
                return role;
              }
              return Object.assign({}, role, {
                [roleName]: droplet
              });
            })
            .sort((roleA, roleB) => {
              // sort name by alphabetical order
              const agentA = getAgent(roleA);
              const agentB = getAgent(roleB);
              const nameA =
                textify(agentA.familyName) || unprefix(getId(agentA));
              const nameB =
                textify(agentB.familyName) || unprefix(getId(agentB));
              return nameA.localeCompare(nameB);
            });
        });

      return sortedStaffListByRoleName;
    },
    {}
  );
}
