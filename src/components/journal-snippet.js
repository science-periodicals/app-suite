import React from 'react';
import PropTypes from 'prop-types';
import {
  getId,
  unprefix,
  textify,
  getNodeMap,
  arrayify
} from '@scipe/jsonld';
import {
  bemify,
  Card,
  Value,
  JournalBadge,
  Hyperlink,
  Span,
  ExpansionPanel,
  ExpansionPanelPreview,
  AutoAbridge,
  PaperButton,
  SemanticTags as _SemanticTags,
  provideSubtree,
  ShareMenu
} from '@scipe/ui';
import ApplyModal from './apply-modal';
import StartSubmissionButton from './start-submission-button';

const SemanticTags = provideSubtree(_SemanticTags);

export default class JournalSnippet extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    journal: PropTypes.object.isRequired
  };

  static getDerivedStateFromProps(props, state) {
    if (props.journal !== state.lastJournal) {
      return {
        isExpanded: false,
        isApplyModalOpen: false,
        lastJournal: props.journal
      };
    }
    return null;
  }

  constructor(props) {
    super(props);

    this.state = {
      isExpanded: false,
      isApplyModalOpen: false,
      lastJournal: props.journal
    };
  }

  handleToggle = e => {
    this.setState({ isExpanded: !this.state.isExpanded });
  };

  handleOpenApplyModal = e => {
    this.setState({
      isApplyModalOpen: true
    });
  };

  handleCloseApplyModal = e => {
    this.setState({
      isApplyModalOpen: false
    });
  };

  render() {
    const { user, journal } = this.props;
    const { isExpanded, isApplyModalOpen } = this.state;

    const bem = bemify('journal-snippet');

    return (
      <Card tagName="article" className={bem``}>
        <header className={bem`__header`}>
          <h3 className={bem`__title`}>
            <JournalBadge journal={journal} className={bem`__journal-badge`} />
            <Hyperlink page="journal" periodical={journal} reset={true}>
              <Span>
                {journal.name ||
                  journal.alternateName ||
                  unprefix(journal['@id'])}
              </Span>
            </Hyperlink>
          </h3>
          <ShareMenu
            align="right"
            name={journal.name}
            description={journal.description}
            url={journal.url}
            text={journal.text}
            portal={true}
          />
        </header>

        <section>
          <ExpansionPanel expanded={isExpanded} onChange={this.handleToggle}>
            <ExpansionPanelPreview>
              <AutoAbridge ellipsis={true}>
                {isExpanded ? 'Description' : textify(journal.description)}
              </AutoAbridge>
            </ExpansionPanelPreview>
            <div className={bem`__body __text`}>
              <section>
                <Value>{journal.description}</Value>
              </section>

              {!!arrayify(journal.about).length && (
                <section className={bem`__subjects-section`}>
                  <h4>Subjects</h4>

                  <SemanticTags
                    semanticTagsMap={getNodeMap(
                      arrayify(journal.about).filter(
                        subject =>
                          getId(subject) && getId(subject).startsWith('subject')
                      )
                    )}
                  />
                </section>
              )}
            </div>
          </ExpansionPanel>
        </section>

        <footer className={bem`__footer`}>
          <Hyperlink page="journal" periodical={journal} reset={true}>
            <Span>{journal.alternateName || unprefix(journal['@id'])}</Span>
          </Hyperlink>

          <div className={bem`__footer__controls`}>
            <PaperButton onClick={this.handleOpenApplyModal}>Join</PaperButton>

            <StartSubmissionButton user={user} journal={journal} reset={false}>
              Send submission
            </StartSubmissionButton>
          </div>
        </footer>

        {isApplyModalOpen && (
          <ApplyModal
            fromSubdomain={false}
            journal={journal}
            onClose={this.handleCloseApplyModal}
          />
        )}
      </Card>
    );
  }
}
