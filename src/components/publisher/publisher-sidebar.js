import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { ExpansionPanel, ExpansionPanelPreview, BemTags } from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';
import PublisherSidebarWorkflow from './publisher-sidebar-workflow';
import PublisherSidebarParticipants from './publisher-sidebar-participants';
import PublisherSidebarViews from './publisher-sidebar-views';
import PublisherSidebarResources from './publisher-sidebar-resources';
import PublisherSidebarOutline from './publisher-sidebar-outline';
import { openShell } from '../../actions/ui-action-creators';

class PublisherSidebar extends React.PureComponent {
  static propTypes = {
    user: PropTypes.object.isRequired,

    graphId: PropTypes.string.isRequired,
    journalId: PropTypes.string.isRequired,
    stageId: PropTypes.string,
    actionId: PropTypes.string,
    canViewFilesAttachment: PropTypes.bool,

    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,

    onPanelClick: PropTypes.func.isRequired,

    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool.isRequired,

    // redux
    openShell: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);

    // expansion state
    this.state = {
      isWorkflowOpen: true,
      isParticipantsOpen: true,
      isViewsOpen: true,
      isResourcesOpen: true,
      isOutlineOpen: true
    };
  }

  handleToggle(name, isOpen) {
    this.setState({ [name]: isOpen });
  }

  handleOpenSubmissionShell = () => {
    const { openShell, graphId } = this.props;
    openShell('submission', graphId);
  };

  render() {
    const bem = BemTags();

    const {
      onPanelClick,
      user,
      graphId,
      journalId,
      actionId,
      stageId,
      disabled,
      readOnly,
      canViewFilesAttachment,
      history,
      location
    } = this.props;

    const {
      isWorkflowOpen,
      isParticipantsOpen,
      isViewsOpen,
      isResourcesOpen,
      isOutlineOpen
    } = this.state;

    return (
      <div className={bem`publisher-sidebar`} onClick={onPanelClick}>
        <ExpansionPanel
          expanded={isWorkflowOpen}
          onChange={this.handleToggle.bind(this, 'isWorkflowOpen')}
        >
          <ExpansionPanelPreview>
            <h3 className={bem`__section-title`}>Submission</h3>
            <Iconoclass
              className={bem`__info`}
              iconName="info"
              onClick={this.handleOpenSubmissionShell}
              behavior="button"
              size="2rem"
            />
            <div className={bem`__section-divider`} />
          </ExpansionPanelPreview>
          <PublisherSidebarWorkflow
            user={user}
            graphId={graphId}
            journalId={journalId}
            actionId={actionId}
            stageId={stageId}
            disabled={disabled}
            readOnly={readOnly}
            history={history}
            search={location.search}
          />
        </ExpansionPanel>

        <ExpansionPanel
          data-testid="participants-panel"
          expanded={isParticipantsOpen}
          onChange={this.handleToggle.bind(this, 'isParticipantsOpen')}
        >
          <ExpansionPanelPreview>
            <h3 className={bem`__section-title`}>Participants</h3>
            <div className={bem`__section-divider`} />
          </ExpansionPanelPreview>
          <PublisherSidebarParticipants
            user={user}
            graphId={graphId}
            journalId={journalId}
            stageId={stageId}
            disabled={disabled}
            readOnly={readOnly}
          />
        </ExpansionPanel>

        <ExpansionPanel
          expanded={isResourcesOpen}
          onChange={this.handleToggle.bind(this, 'isResourcesOpen')}
        >
          <ExpansionPanelPreview>
            <h3 className={bem`__section-title`}>Resources</h3>
            <div className={bem`__section-divider`} />
          </ExpansionPanelPreview>
          <PublisherSidebarResources
            user={user}
            graphId={graphId}
            journalId={journalId}
            actionId={actionId}
            stageId={stageId}
            disabled={disabled}
            readOnly={readOnly}
            history={history}
            search={location.search}
          />
        </ExpansionPanel>

        <ExpansionPanel
          expanded={isViewsOpen}
          onChange={this.handleToggle.bind(this, 'isViewsOpen')}
        >
          <ExpansionPanelPreview>
            <h3 className={bem`__section-title`}>Annotations</h3>
            <div className={bem`__section-divider`} />
          </ExpansionPanelPreview>
          <PublisherSidebarViews
            user={user}
            graphId={graphId}
            journalId={journalId}
            actionId={actionId}
            stageId={stageId}
            disabled={disabled}
            readOnly={readOnly}
            history={history}
            location={location}
          />
        </ExpansionPanel>

        <ExpansionPanel
          expanded={isOutlineOpen}
          onChange={this.handleToggle.bind(this, 'isOutlineOpen')}
        >
          <ExpansionPanelPreview>
            <h3 className={bem`__section-title`}>Content</h3>
            <div className={bem`__section-divider`} />
          </ExpansionPanelPreview>
          <PublisherSidebarOutline
            user={user}
            graphId={graphId}
            journalId={journalId}
            actionId={actionId}
            stageId={stageId}
            canViewFilesAttachment={canViewFilesAttachment}
            disabled={disabled}
            readOnly={readOnly}
            history={history}
            search={location.search}
          />
        </ExpansionPanel>
      </div>
    );
  }
}

export default connect(
  null,
  { openShell }
)(PublisherSidebar);

export const StyleSectionLabel = ({ children, tagName }) => {
  const bem = BemTags('publisher-sidebar');
  const El = tagName || 'h4';
  return <El className={bem`__section-label`}>{children}</El>;
};

StyleSectionLabel.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string
};

export const StyleSection = ({ children, tagName, className }) => {
  const bem = BemTags('publisher-sidebar');
  const El = tagName || 'div';
  return (
    <El className={bem`__section` + ` ${className ? className : ''}`}>
      {children}
    </El>
  );
};

StyleSection.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string,
  className: PropTypes.string
};

export const StyleList = ({ children, tagName }) => {
  const bem = BemTags('publisher-sidebar');
  const El = tagName || 'ul';
  return <El className={bem`__list`}>{children}</El>;
};

StyleList.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string
};

export const StyleListRow = ({ children, tagName, active, className }) => {
  const bem = BemTags('publisher-sidebar');
  const El = tagName || 'li';
  return (
    <El
      className={
        bem`__list-row ${active ? '--active' : ''}` +
        ` ${className ? className : ''}`
      }
    >
      {children}
    </El>
  );
};

StyleListRow.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string,
  active: PropTypes.bool,
  className: PropTypes.string
};
