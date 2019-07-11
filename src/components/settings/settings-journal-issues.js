import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { arrayify, getId, unprefix } from '@scipe/jsonld';
import {
  Tooltip,
  Card,
  Modal,
  PaperActionButton,
  PaperActionButtonOption,
  BemTags,
  Span,
  ControlPanel,
  Spinner,
  PaperButton,
  DateFromNow
} from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';
import IssueEditor from '../issue-editor';
import SearchableIssueList from '../searchable-issue-list';
import CreateIssueForm from '../create-issue-form';
import {
  createIssue,
  updateIssue,
  updateIssueBanner,
  deleteIssue
} from '../../actions/issue-action-creators';
import { updateJournal } from '../../actions/journal-action-creators';
import {
  StyleSectionHeader,
  StyleSectionTitle,
  StyleSectionControls,
  StyleModalBody,
  StyleFormSetListItemGroup,
  StyleFormSet,
  StyleFormSetListItemTitle,
  StyleFormSetList,
  StyleFormSetListItem
} from './settings';

// NOTE: the issues are pre-fetched upstream by settings-journal.js
class SettingsJournalIssues extends React.Component {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool,
    user: PropTypes.object,
    acl: PropTypes.object.isRequired,
    journal: PropTypes.object,

    // redux
    issues: PropTypes.arrayOf(PropTypes.object),
    searchStatus: PropTypes.shape({
      active: PropTypes.bool,
      error: PropTypes.instanceOf(Error)
    }),
    crudStatus: PropTypes.shape({
      active: PropTypes.bool,
      error: PropTypes.instanceOf(Error)
    }),

    updateJournal: PropTypes.func.isRequired,
    createIssue: PropTypes.func.isRequired,
    updateIssue: PropTypes.func.isRequired,
    updateIssueBanner: PropTypes.func.isRequired,
    deleteIssue: PropTypes.func.isRequired
  };

  static defaultProps = {
    fetchStatus: {},
    crudStatus: {}
  };

  static getDerivedStateFromProps(props, state) {
    if (getId(props.journal) !== getId(state.lastJournal)) {
      return {
        createdType: null,
        openId: null,
        lastJournal: props.journal,
        isCreating: false
      };
    }
    return null;
  }

  constructor(props) {
    super(props);
    this.state = {
      createdType: null,
      openId: null,
      lastJournal: props.journal,
      isCreating: false
    };
  }

  componentDidUpdate(prevProps) {
    const { isCreating } = this.state;
    const { issues } = this.props;

    // Autoclose modal
    if (
      isCreating &&
      prevProps.crudStatus.active &&
      !this.props.crudStatus.active
    ) {
      this.setState({
        opendId: getId(issues[0]),
        isCreating: false,
        createdType: null
      });
    }
  }

  handleToggle(issue, e) {
    e.preventDefault();
    this.setState({
      openId: this.state.openId === getId(issue) ? null : getId(issue)
    });
  }

  handleClose = e => {
    this.setState({
      openId: null
    });
  };

  handleOpenModal(type) {
    this.setState({
      createdType: type
    });
  }

  handleCloseModal = () => {
    this.setState({
      createdType: null
    });
  };

  handleSubmit = newIssue => {
    const { createIssue, journal } = this.props;
    this.setState({ isCreating: true });

    createIssue(getId(journal), newIssue);
  };

  handleDelete(issueId) {
    const { deleteIssue, journal } = this.props;
    deleteIssue(getId(journal), issueId);
  }

  handleToggleFeaturedIssue(issueId, nextIsFeatured, e) {
    const { journal, updateJournal } = this.props;

    e.stopPropagation();
    e.preventDefault();

    let nextWorkFeatured = arrayify(journal.workFeatured).filter(
      work => getId(work) !== issueId
    );
    if (nextIsFeatured) {
      nextWorkFeatured.push(issueId);
    }

    updateJournal(getId(journal), {
      workFeatured: nextWorkFeatured.length ? nextWorkFeatured : null
    });
  }

  render() {
    const bem = BemTags();
    const { openId, createdType } = this.state;
    const {
      journal,
      disabled: _disabled,
      user,
      acl,
      readOnly,
      issues,
      crudStatus,
      updateIssue,
      updateIssueBanner
    } = this.props;

    const disabled = _disabled || !acl.checkPermission(user, 'AdminPermission');

    const editedIssue = issues.find(issue => getId(issue) === openId);

    return (
      <section className={bem`settings-journal-issues`}>
        <StyleSectionHeader>
          <StyleSectionTitle>Issues</StyleSectionTitle>
        </StyleSectionHeader>

        <SearchableIssueList journal={journal}>
          {() => (
            <StyleFormSetList>
              {issues.map(issue => {
                const isFeatured = arrayify(journal.workFeatured).some(
                  work => getId(work) === getId(issue)
                );

                return (
                  <StyleFormSetListItem
                    key={getId(issue)}
                    active={getId(issue) === openId}
                    onClick={this.handleToggle.bind(this, issue)}
                  >
                    <Spinner
                      progressMode={
                        getId(issue) === openId && crudStatus.active
                          ? 'spinUp'
                          : 'none'
                      }
                    >
                      <Iconoclass
                        iconName={getId(issue) === openId ? 'eye' : 'none'}
                        behavior="button"
                        onClick={this.handleToggle.bind(this, getId(issue))}
                        size="16px"
                      />
                    </Spinner>

                    <StyleFormSetListItemTitle>
                      {issue['@type'] === 'PublicationIssue' ? (
                        <span>Issue number {issue.issueNumber}</span>
                      ) : (
                        <Span>
                          {issue.name ||
                            unprefix(getId(issue)).split('/', 2)[1]}
                        </Span>
                      )}
                    </StyleFormSetListItemTitle>

                    <StyleFormSetListItemGroup align="right">
                      <span>
                        Published{' '}
                        <DateFromNow>{issue.datePublished}</DateFromNow>
                      </span>

                      <Tooltip
                        displayText={
                          isFeatured
                            ? 'featured issue (click to unfeature)'
                            : 'click to mark issue as featured'
                        }
                      >
                        <Iconoclass
                          behavior="toggle"
                          iconName="star"
                          checked={isFeatured}
                          disabled={crudStatus.active}
                          onClick={this.handleToggleFeaturedIssue.bind(
                            this,
                            getId(issue),
                            !isFeatured
                          )}
                        />
                      </Tooltip>

                      {issue['@type'] === 'SpecialPublicationIssue' ? (
                        <Iconoclass
                          behavior="button"
                          iconName="trash"
                          disabled={crudStatus.active}
                          onClick={this.handleDelete.bind(this, getId(issue))}
                        />
                      ) : (
                        <Iconoclass iconName="none" />
                      )}
                    </StyleFormSetListItemGroup>
                  </StyleFormSetListItem>
                );
              })}
            </StyleFormSetList>
          )}
        </SearchableIssueList>

        {/* Create new issue buttons */}
        {!readOnly && (
          <StyleSectionControls>
            <PaperActionButton large={false} disabled={disabled}>
              <PaperActionButtonOption
                onClick={this.handleOpenModal.bind(this, 'PublicationIssue')}
                iconName="formatListNumbered"
                label="Sequential Issue"
              />
              <PaperActionButtonOption
                onClick={this.handleOpenModal.bind(
                  this,
                  'SpecialPublicationIssue'
                )}
                iconName="star"
                label="Special Issue"
              />
            </PaperActionButton>
          </StyleSectionControls>
        )}

        {/* Create new issue modal */}
        {createdType && (
          <Modal>
            <Card>
              <StyleModalBody>
                <StyleSectionHeader tagName="header">
                  <StyleSectionTitle>
                    Create a new{' '}
                    {createdType === 'PublicationIssue'
                      ? 'sequential issue'
                      : 'special issue'}
                  </StyleSectionTitle>
                </StyleSectionHeader>

                <CreateIssueForm
                  type={createdType}
                  periodicalId={getId(journal)}
                  active={crudStatus.active}
                  error={crudStatus.error}
                  onCancel={this.handleCloseModal}
                  onSubmit={this.handleSubmit}
                />
              </StyleModalBody>
            </Card>
          </Modal>
        )}

        {/* Issue editor */}
        {editedIssue != null && (
          <StyleFormSet>
            <IssueEditor
              issue={editedIssue}
              journal={journal}
              updateIssue={updateIssue}
              updateIssueBanner={updateIssueBanner}
            />
            <ControlPanel error={crudStatus.error}>
              <PaperButton onClick={this.handleClose}>Close</PaperButton>
            </ControlPanel>
          </StyleFormSet>
        )}
      </section>
    );
  }
}

export default connect(
  createSelector(
    state => state.settingsIssueList,
    state => state.droplets,
    (state, props) => state.issueCrudStatusByPeriodicalId[getId(props.journal)],
    (settingsIssueList, droplets, crudStatus) => {
      return {
        searchStatus: settingsIssueList,
        issues: arrayify(settingsIssueList.issueIds)
          .map(id => droplets[id])
          .filter(Boolean),
        crudStatus
      };
    }
  ),
  {
    updateJournal,
    createIssue,
    updateIssue,
    updateIssueBanner,
    deleteIssue
  }
)(SettingsJournalIssues);
