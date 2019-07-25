import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import {
  unprefix,
  getId,
  arrayify,
  getValue,
  createValue,
  textify
} from '@scipe/jsonld';
import {
  AutoAbridge,
  Tooltip,
  PaperSwitch,
  PaperActionButton,
  PaperInput,
  RichTextarea,
  AuthorGuidelinesEditor,
  withOnSubmit,
  BemTags,
  ControlPanel,
  PaperButton,
  Spinner,
  WorkflowAutocomplete,
  PeerReviewBadge,
  Span
} from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';
import {
  createPeriodicalPublicationType,
  updatePeriodicalPublicationType,
  archivePeriodicalPublicationType,
  togglePeriodicalPublicationTypeStatus
} from '../../actions/type-action-creators';
import {
  StyleFormSetList,
  StyleFormSetListItem,
  StyleFormSetListItemGroup,
  StyleSection,
  StyleSectionHeader,
  StyleSectionSubTitle,
  StyleSectionTitle
} from './settings';
import { fetchDroplet } from '../../actions/droplet-action-creators';
import { compareDefinedNames } from '../../utils/sort';

const ControledPaperInput = withOnSubmit(PaperInput);

// TODO ObjectSpecificationEditor

// NOTE: the publication types are pre-fetched upstream by settings-journal.js
class SettingsJournalPublicationTypes extends React.Component {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool,
    user: PropTypes.object,
    acl: PropTypes.object.isRequired,
    params: PropTypes.shape({
      journalId: PropTypes.string.isRequired
    }),
    journal: PropTypes.object,

    // redux
    droplets: PropTypes.object.isRequired,
    publicationTypes: PropTypes.arrayOf(PropTypes.object),
    crudPublicationTypeStatus: PropTypes.object,
    createPeriodicalPublicationType: PropTypes.func.isRequired,
    updatePeriodicalPublicationType: PropTypes.func.isRequired,
    togglePeriodicalPublicationTypeStatus: PropTypes.func.isRequired,
    archivePeriodicalPublicationType: PropTypes.func.isRequired,
    fetchDroplet: PropTypes.func.isRequired
  };

  static defaultProps = {
    publicationTypes: []
  };

  static getDerivedStateFromProps(props, state) {
    if (getId(props.journal) !== getId(state.lastJournal)) {
      return {
        openPublicationTypeId: null,
        lastJournal: props.journal
      };
    }
    return null;
  }

  constructor(props) {
    super(props);
    this.state = {
      openPublicationTypeId: null,
      lastJournal: props.journal
    };

    this.workflowAutocompleteRef = React.createRef();
  }

  handleCreate = () => {
    const { journal } = this.props;
    this.props.createPeriodicalPublicationType(getId(journal));
  };

  handleToggle(publicationTypeId, e) {
    e.preventDefault();
    this.setState({
      openPublicationTypeId:
        this.state.openPublicationTypeId === publicationTypeId
          ? null
          : publicationTypeId
    });
  }

  handleClose = e => {
    this.setState({
      openPublicationTypeId: null
    });
  };

  handlePublicationTypeChange = e => {
    const { journal } = this.props;
    const { openPublicationTypeId: publicationTypeId } = this.state;

    this.props.updatePeriodicalPublicationType(
      getId(journal),
      publicationTypeId,
      { [e.target.name]: createValue(e.target.value) }
    );
  };

  handleGuidelinesChange = nextObjectSpecification => {
    const { journal } = this.props;
    const { openPublicationTypeId: publicationTypeId } = this.state;

    this.props.updatePeriodicalPublicationType(
      getId(journal),
      publicationTypeId,
      {
        objectSpecification: nextObjectSpecification
      }
    );
  };

  handleArchive(publicationTypeId, e) {
    e.preventDefault();

    const { journal } = this.props;
    this.props.archivePeriodicalPublicationType(
      getId(journal),
      publicationTypeId
    );
  }

  handleToggleActivate(publicationTypeId, activate) {
    const { togglePeriodicalPublicationTypeStatus, journal } = this.props;
    togglePeriodicalPublicationTypeStatus(
      getId(journal),
      publicationTypeId,
      activate
    );
  }

  handleSubmitEligibleWorkflow = (value, item) => {
    const {
      journal,
      fetchDroplet,
      updatePeriodicalPublicationType,
      publicationTypes
    } = this.props;
    const { openPublicationTypeId: publicationTypeId } = this.state;
    const publicationType = publicationTypes.find(
      publicationType => getId(publicationType) === publicationTypeId
    );

    if (item) {
      this.workflowAutocompleteRef.current.reset();

      fetchDroplet(getId(item));

      updatePeriodicalPublicationType(getId(journal), publicationTypeId, {
        eligibleWorkflow: arrayify(publicationType.eligibleWorkflow)
          .filter(workflow => getId(workflow) !== getId(item))
          .concat(getId(item))
      });
    }
  };

  handleDeleteEligibleWorkflow(workflowId) {
    const {
      journal,
      updatePeriodicalPublicationType,
      publicationTypes
    } = this.props;
    const { openPublicationTypeId: publicationTypeId } = this.state;
    const publicationType = publicationTypes.find(
      publicationType => getId(publicationType) === publicationTypeId
    );

    const nextEligibleWorkflows = arrayify(
      publicationType.eligibleWorkflow
    ).filter(workflow => getId(workflow) !== workflowId);

    updatePeriodicalPublicationType(getId(journal), publicationTypeId, {
      eligibleWorkflow: nextEligibleWorkflows.length
        ? nextEligibleWorkflows
        : null
    });
  }

  render() {
    const bem = BemTags();
    const { openPublicationTypeId } = this.state;
    const {
      publicationTypes,
      crudPublicationTypeStatus,
      disabled: _disabled,
      user,
      acl,
      readOnly,
      journal,
      droplets
    } = this.props;

    const disabled = _disabled || !acl.checkPermission(user, 'AdminPermission');

    const publicationType = publicationTypes.find(
      publicationType => getId(publicationType) === openPublicationTypeId
    );

    const workflows = arrayify(
      publicationType && publicationType.eligibleWorkflow
    )
      .map(workflow => droplets[getId(workflow)])
      .filter(Boolean)
      .sort(compareDefinedNames);

    return (
      <section className={bem`settings-journal-publication-types`}>
        <StyleSectionHeader>
          <StyleSectionTitle className={bem`__title`}>
            Publication Types
          </StyleSectionTitle>
        </StyleSectionHeader>
        <StyleFormSetList>
          {publicationTypes.map(publicationType => {
            const isActive =
              crudPublicationTypeStatus[getId(publicationType)] &&
              crudPublicationTypeStatus[getId(publicationType)].status ===
                'active';

            return (
              <StyleFormSetListItem
                active={getId(publicationType) === openPublicationTypeId}
                key={getId(publicationType)}
              >
                <StyleFormSetListItemGroup
                  onClick={this.handleToggle.bind(this, getId(publicationType))}
                >
                  <div className={bem`__type-list-item-title`}>
                    <div className={bem`__viewing-icon-container`}>
                      <Spinner progressMode={isActive ? 'spinUp' : 'none'}>
                        <Iconoclass
                          className={bem`__viewing-icon`}
                          iconName={
                            getId(publicationType) === openPublicationTypeId
                              ? 'eye'
                              : 'none'
                          }
                          behavior="button"
                          onClick={this.handleToggle.bind(
                            this,
                            getId(publicationType)
                          )}
                          size="16px"
                        />
                      </Spinner>
                    </div>
                    <a
                      href="#"
                      onClick={this.handleToggle.bind(
                        this,
                        getId(publicationType)
                      )}
                    >
                      {textify(publicationType.name) ||
                        'Untitled Publication Type'}
                    </a>
                  </div>
                </StyleFormSetListItemGroup>

                <StyleFormSetListItemGroup align="right">
                  <Tooltip displayText="Activate publication type.">
                    <PaperSwitch
                      id={`check-${getId(publicationType)}`}
                      disabled={disabled || isActive}
                      checked={
                        publicationType.publicationTypeStatus ===
                        'ActivePublicationTypeStatus'
                      }
                      onClick={this.handleToggleActivate.bind(
                        this,
                        getId(publicationType)
                      )}
                    />
                  </Tooltip>

                  {!readOnly && (
                    <Tooltip displayText="Activate publication type.">
                      <Iconoclass
                        iconName="trash"
                        disabled={disabled}
                        onClick={this.handleArchive.bind(
                          this,
                          getId(publicationType)
                        )}
                        behavior="button"
                      />
                    </Tooltip>
                  )}
                </StyleFormSetListItemGroup>
              </StyleFormSetListItem>
            );
          })}
        </StyleFormSetList>

        {!readOnly && (
          <div className={bem`__type-list-controls`}>
            <PaperActionButton
              large={false}
              onClick={this.handleCreate}
              disabled={disabled}
            />
          </div>
        )}

        {!!publicationType && (
          <section className={bem`__publication-type`}>
            <div className={bem`__top-level-inputs`}>
              <ControledPaperInput
                label="Name"
                name="name"
                autoComplete="off"
                disabled={disabled}
                readOnly={readOnly}
                onSubmit={this.handlePublicationTypeChange}
                value={getValue(publicationType.name) || ''}
              />
              <RichTextarea
                label="Description"
                name="description"
                disabled={disabled}
                readOnly={readOnly}
                onSubmit={this.handlePublicationTypeChange}
                defaultValue={publicationType.description}
              />
            </div>

            <StyleSection>
              <StyleSectionSubTitle>Eligible workflows</StyleSectionSubTitle>

              <ul className="sa__clear-list-styles">
                {workflows.map(workflow => (
                  <li key={getId(workflow)}>
                    <div className={bem`__workflow`}>
                      <span className={bem`__workflow-name-wrapper`}>
                        <AutoAbridge ellipsis={true}>
                          <Span>
                            {workflow.name ||
                              `Untitled workflow ${unprefix(getId(workflow))}`}
                          </Span>
                        </AutoAbridge>
                      </span>
                      <div className={bem`__workflow-controls`}>
                        <PeerReviewBadge workflowSpecification={workflow} />
                        {/* TODO add status icon for cases when workflow is deactivated or archived */}
                        <Iconoclass
                          tagName="span"
                          iconName="delete"
                          disabled={disabled}
                          behavior="button"
                          onClick={this.handleDeleteEligibleWorkflow.bind(
                            this,
                            getId(workflow)
                          )}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <WorkflowAutocomplete
                ref={this.workflowAutocompleteRef}
                journalId={getId(journal)}
                name="eligibleWorkflow"
                disabled={disabled}
                label="Add workflow"
                blacklist={arrayify(publicationType.eligibleWorkflow)}
                onSubmit={this.handleSubmitEligibleWorkflow}
              />
            </StyleSection>

            <StyleSection>
              <StyleSectionSubTitle>Author Guidelines</StyleSectionSubTitle>
              <p className={bem`__sub-title`}>
                Add, delete, edit and reorder the sections below to configure
                the journal’s custom style guide.
              </p>

              <AuthorGuidelinesEditor
                objectSpecification={publicationType.objectSpecification}
                disabled={disabled}
                readOnly={readOnly}
                onChange={this.handleGuidelinesChange}
              />

              <ControlPanel>
                <PaperButton onClick={this.handleClose}>close</PaperButton>
              </ControlPanel>
            </StyleSection>
          </section>
        )}
      </section>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => props.journal,
    state => state.publicationTypeMap,
    state => state.crudPublicationTypeStatus,
    state => state.droplets,
    (
      journal = {},
      publicationTypeMap = {},
      crudPublicationTypeStatus = {},
      droplets
    ) => {
      const publicationTypes = Object.values(publicationTypeMap)
        .filter(publicationType => {
          return (
            getId(publicationType.isPublicationTypeOf) === getId(journal) &&
            publicationType.publicationTypeStatus !==
              'ArchivedPublicationTypeStatus'
          );
        })
        .sort(compareDefinedNames);

      return { crudPublicationTypeStatus, publicationTypes, droplets };
    }
  ),
  {
    createPeriodicalPublicationType,
    updatePeriodicalPublicationType,
    togglePeriodicalPublicationTypeStatus,
    archivePeriodicalPublicationType,
    fetchDroplet
  }
)(SettingsJournalPublicationTypes);
