import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { arrayify, getId } from '@scipe/jsonld';
import {
  PaperActionButton,
  bemify,
  Span,
  Spinner,
  DateFromNow
} from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';
import RfaEditor from '../rfa-editor';
import SearchableRfaList from '../searchable-rfa-list';
import {
  StyleSectionHeader,
  StyleSectionTitle,
  StyleSectionControls,
  StyleFormSetListItemGroup,
  StyleFormSet,
  StyleFormSetListItemTitle,
  StyleFormSetList,
  StyleFormSetListItem
} from './settings';
import {
  createRfa,
  updateRfa,
  deleteRfa
} from '../../actions/rfa-action-creators';

class SettingsJournalRfas extends React.Component {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool,
    user: PropTypes.object,
    acl: PropTypes.object.isRequired,
    journal: PropTypes.object,

    // redux
    rfas: PropTypes.arrayOf(PropTypes.object),
    isFetching: PropTypes.bool,
    fetchingError: PropTypes.instanceOf(Error),
    crudStatus: PropTypes.shape({
      active: PropTypes.bool,
      error: PropTypes.instanceOf(Error)
    }),
    createRfa: PropTypes.func.isRequired,
    updateRfa: PropTypes.func.isRequired,
    deleteRfa: PropTypes.func.isRequired
  };

  static defaultProps = {
    fetchStatus: {},
    crudStatus: {}
  };

  static getDerivedStateFromProps(props, state) {
    if (getId(props.journal) !== getId(state.lastJournal)) {
      return {
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
      openId: null,
      lastJournal: props.journal,
      isCreating: false
    };
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentDidUpdate(prevProps) {
    const { isCreating } = this.state;
    const { rfas } = this.props;

    // Autoclose modal
    if (
      isCreating &&
      prevProps.crudStatus.active &&
      !this.props.crudStatus.active
    ) {
      this.setState({
        opendId: getId(rfas[0]),
        isCreating: false
      });
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  handleToggle(issue, e) {
    e.preventDefault();
    this.setState({
      openId: this.state.openId === getId(issue) ? null : getId(issue)
    });
  }

  handleCreateRfa = e => {
    const { journal, createRfa } = this.props;
    createRfa(getId(journal)).then(rfa => {
      if (this._isMounted) {
        this.setState({
          openId: getId(rfa)
        });
      }
    });
  };

  handleUpdateRfa = upd => {
    const { rfas, updateRfa, journal } = this.props;
    const { openId } = this.state;
    const rfa = rfas.find(rfa => getId(rfa) === openId);
    updateRfa(getId(journal), rfa, upd);
  };

  handleDeleteRfa = () => {
    const { rfas, deleteRfa, journal } = this.props;
    const { openId } = this.state;
    const rfa = rfas.find(rfa => getId(rfa) === openId);
    deleteRfa(getId(journal), getId(rfa));
  };

  render() {
    const { openId } = this.state;
    const {
      journal,
      disabled: _disabled,
      user,
      acl,
      readOnly,
      rfas,
      crudStatus
    } = this.props;

    const disabled = _disabled || !acl.checkPermission(user, 'AdminPermission');

    const editedRfa = rfas.find(rfa => getId(rfa) === openId);

    const bem = bemify('settings-journal-rfas');

    return (
      <section className={bem``}>
        <StyleSectionHeader>
          <StyleSectionTitle>Request for articles</StyleSectionTitle>
        </StyleSectionHeader>

        <SearchableRfaList journal={journal}>
          <StyleFormSetList>
            {rfas.map(rfa => {
              return (
                <StyleFormSetListItem
                  key={getId(rfa)}
                  active={getId(rfa) === openId}
                  onClick={this.handleToggle.bind(this, rfa)}
                >
                  <Spinner
                    progressMode={
                      getId(rfa) === openId && crudStatus.active
                        ? 'spinUp'
                        : 'none'
                    }
                  >
                    <Iconoclass
                      iconName={getId(rfa) === openId ? 'eye' : 'none'}
                      behavior="button"
                      onClick={this.handleToggle.bind(this, getId(rfa))}
                      size="16px"
                    />
                  </Spinner>

                  <StyleFormSetListItemTitle>
                    <Span>{rfa.name || 'Untitled RFA'}</Span>
                  </StyleFormSetListItemTitle>

                  <StyleFormSetListItemGroup align="right">
                    <span>
                      {rfa.actionStatus === 'PotentialActionStatus'
                        ? 'Started'
                        : rfa.actionStatus === 'ActiveActionStatus'
                        ? 'Published'
                        : 'Completed'}{' '}
                      <DateFromNow>{rfa.startTime}</DateFromNow>
                    </span>

                    <Iconoclass
                      iconName={
                        rfa.actionStatus === 'PotentialActionStatus'
                          ? 'pencil'
                          : rfa.actionStatus === 'ActiveActionStatus'
                          ? 'rfa'
                          : 'check'
                      }
                      disabled={crudStatus.active}
                    />
                  </StyleFormSetListItemGroup>
                </StyleFormSetListItem>
              );
            })}
          </StyleFormSetList>
        </SearchableRfaList>

        {/* Create new RFA */}
        {!readOnly && (
          <StyleSectionControls>
            <PaperActionButton
              large={false}
              disabled={disabled}
              onClick={this.handleCreateRfa}
            />
          </StyleSectionControls>
        )}

        {/* RFA editor */}
        {editedRfa != null && (
          <StyleFormSet>
            <RfaEditor
              disabled={disabled}
              journal={journal}
              rfa={editedRfa}
              onUpdate={this.handleUpdateRfa}
              onDelete={this.handleDeleteRfa}
            />
          </StyleFormSet>
        )}
      </section>
    );
  }
}

export default connect(
  createSelector(
    state => state.settingsRfaList,
    state => state.droplets,
    (state, props) => state.issueCrudStatusByPeriodicalId[getId(props.journal)],
    (settingsRfaList, droplets, crudStatus) => {
      return {
        isFetching: settingsRfaList.active,
        fetchingError: settingsRfaList.error,
        rfas: arrayify(settingsRfaList.rfaIds)
          .map(id => droplets[id])
          .filter(Boolean),
        crudStatus
      };
    }
  ),
  {
    createRfa,
    updateRfa,
    deleteRfa
  }
)(SettingsJournalRfas);
