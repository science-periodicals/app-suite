import React from 'react';
import PropTypes from 'prop-types';
import cloneDeep from 'lodash/cloneDeep';
import traverse from 'traverse';
import { getId, arrayify, unrole } from '@scipe/jsonld';
import { createId } from '@scipe/librarian';
import Iconoclass from '@scipe/iconoclass';
import {
  BemTags,
  OrganizationEditor,
  Spinner,
  Tooltip,
  PaperActionButton,
  RdfaOrganization
} from '@scipe/ui';
import {
  StyleFormSetList,
  StyleFormSetListItem,
  StyleFormSetListItemGroup
} from './settings';

export default class SettingsProfileAffiliations extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool,
    profile: PropTypes.object.isRequired,
    updateProfile: PropTypes.func.isRequired,
    updateProfileStatus: PropTypes.shape({
      active: PropTypes.bool,
      error: PropTypes.instanceOf(Error)
    })
  };

  static getDerivedStateFromProps(props, state) {
    if (getId(props.profile) !== getId(state.lastProfile)) {
      return {
        openAffiliationId: null,
        lastProfile: props.profile
      };
    }
    return null;
  }

  constructor(props) {
    super(props);
    this.state = {
      openAffiliationId: null,
      lastProfile: props.profile
    };
  }

  handleToggleAffiliation(openAffiliationId, e) {
    e.preventDefault();
    this.setState({
      openAffiliationId:
        this.state.openAffiliationId === openAffiliationId
          ? null
          : openAffiliationId
    });
  }

  handleAddAffiliation = () => {
    const { profile, updateProfile } = this.props;

    const newAffiliation = {
      '@id': createId('blank')['@id'],
      '@type': 'OrganizationRole',
      affiliation: {
        '@id': createId('blank')['@id'],
        '@type': 'Organization'
      }
    };

    const upd = {
      affiliation: arrayify(profile.affiliation).concat(newAffiliation)
    };

    updateProfile(upd);
    this.setState({
      openAffiliationId: getId(newAffiliation)
    });
  };

  handleRemoveAffiliation(affiliationId) {
    const { profile, updateProfile } = this.props;
    const { openAffiliationId } = this.state;

    const upd = {
      affiliation: arrayify(profile.affiliation).filter(
        affiliation => getId(affiliation) !== affiliationId
      )
    };

    updateProfile(upd);

    if (affiliationId === openAffiliationId) {
      this.setState({
        openAffiliationId: null
      });
    }
  }

  handleCreateNode(affiliationId, parentNode, parentKey, value) {
    const { profile, updateProfile } = this.props;
    const nextAffiliations = arrayify(profile.affiliation).map(affiliation => {
      if (getId(affiliation) == affiliationId) {
        const nextAffiliation = cloneDeep(unrole(affiliation, 'affiliation'));

        let nextNode;
        traverse(nextAffiliation).forEach(function(value) {
          if (this.key === '@id' && value === getId(parentNode)) {
            nextNode = this.parent.node;
          }
        });

        if (nextNode) {
          nextNode[parentKey] = value;
        }

        return Object.assign({}, affiliation, { affiliation: nextAffiliation });
      }
      return affiliation;
    });

    updateProfile({ affiliation: nextAffiliations });
  }

  handleUpdateNode(affiliationId, node, key, value, { force } = {}) {
    const { profile, updateProfile } = this.props;
    const nextAffiliations = arrayify(profile.affiliation).map(affiliation => {
      if (getId(affiliation) == affiliationId) {
        const nextAffiliation = cloneDeep(unrole(affiliation, 'affiliation'));

        let nextNode;
        traverse(nextAffiliation).forEach(function(value) {
          if (this.key === '@id' && value === getId(node)) {
            nextNode = this.parent.node;
          }
        });

        if (nextNode) {
          nextNode[key] = value;
        }

        return Object.assign({}, affiliation, { affiliation: nextAffiliation });
      }
      return affiliation;
    });

    updateProfile({ affiliation: nextAffiliations });
  }

  handleDeleteNode(affiliationId, parentNode, parentKey, value) {
    const { profile, updateProfile } = this.props;
    const nextAffiliations = arrayify(profile.affiliation).map(affiliation => {
      if (getId(affiliation) == affiliationId) {
        const nextAffiliation = cloneDeep(unrole(affiliation, 'affiliation'));

        let nextNode;
        traverse(nextAffiliation).forEach(function(value) {
          if (this.key === '@id' && value === getId(parentNode)) {
            nextNode = this.parent.node;
          }
        });

        if (nextNode) {
          delete nextNode[parentKey];
        }

        return Object.assign({}, affiliation, { affiliation: nextAffiliation });
      }
      return affiliation;
    });

    updateProfile({ affiliation: nextAffiliations });
  }

  render() {
    const { profile, updateProfileStatus, disabled, readOnly } = this.props;
    const { openAffiliationId } = this.state;

    const bem = BemTags();

    const openAffiliation = arrayify(profile.affiliation).find(
      node => getId(node) === openAffiliationId
    );

    return (
      <section className={bem`settings-profile-affiliations`}>
        <StyleFormSetList>
          {arrayify(profile.affiliation).map(affiliation => {
            return (
              <StyleFormSetListItem
                active={getId(affiliation) === openAffiliationId}
                key={getId(affiliation)}
              >
                <StyleFormSetListItemGroup>
                  <Spinner
                    progressMode={
                      updateProfileStatus.active &&
                      getId(affiliation) === openAffiliationId
                        ? 'spinUp'
                        : 'none'
                    }
                  >
                    <Iconoclass
                      iconName={
                        getId(affiliation) === openAffiliationId
                          ? affiliation.actionStatus === 'PotentialActionStatus'
                            ? 'pencil'
                            : 'eye'
                          : 'none'
                      }
                      behavior="button"
                      onClick={this.handleToggleAffiliation.bind(
                        this,
                        affiliation
                      )}
                      size="16px"
                    />
                  </Spinner>
                  <a
                    href="#"
                    className={bem`__affiliation-link`}
                    onClick={this.handleToggleAffiliation.bind(
                      this,
                      getId(affiliation)
                    )}
                  >
                    <RdfaOrganization
                      object={unrole(affiliation, 'affiliation')}
                      link={false}
                    >
                      Untitled organization
                    </RdfaOrganization>
                  </a>
                </StyleFormSetListItemGroup>
                <StyleFormSetListItemGroup align="right">
                  <Tooltip displayText="Archive Affiliation">
                    <Iconoclass
                      iconName="trash"
                      disabled={disabled || updateProfileStatus.active}
                      behavior="button"
                      onClick={this.handleRemoveAffiliation.bind(
                        this,
                        getId(affiliation)
                      )}
                    />
                  </Tooltip>
                </StyleFormSetListItemGroup>
              </StyleFormSetListItem>
            );
          })}
        </StyleFormSetList>

        {!readOnly && (
          <div className={bem`__add-affiliation`}>
            <PaperActionButton
              large={false}
              onClick={this.handleAddAffiliation}
              disabled={disabled}
            />
          </div>
        )}

        {!!openAffiliation && (
          <div className={bem`__affiliation-editor`}>
            <OrganizationEditor
              disabled={disabled}
              readOnly={readOnly}
              allowPersonTypeSelection={false}
              node={unrole(openAffiliation, 'affiliation')}
              onCreate={this.handleCreateNode.bind(this, openAffiliationId)}
              onUpdate={this.handleUpdateNode.bind(this, openAffiliationId)}
              onDelete={this.handleDeleteNode.bind(this, openAffiliationId)}
            />
          </div>
        )}
      </section>
    );
  }
}
