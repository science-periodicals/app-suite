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
  DateFromNow,
  JournalBadge,
  Span,
  ExpansionPanel,
  ExpansionPanelPreview,
  AutoAbridge,
  Hyperlink,
  SemanticTags as _SemanticTags,
  provideSubtree,
  ShareMenu
} from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';
import StartSubmissionButton from './start-submission-button';

const SemanticTags = provideSubtree(_SemanticTags);

export default class RfaSnippet extends React.Component {
  static propTypes = {
    user: PropTypes.object,
    reset: PropTypes.bool, // if `true` we are from a subdomain
    defaultIsExpanded: PropTypes.bool,
    rfa: PropTypes.shape({
      '@type': PropTypes.oneOf(['RequestArticleAction']).isRequired
    }).isRequired,
    journal: PropTypes.object
  };

  static defaultProps = {
    defaultIsExpanded: false
  };

  constructor(props) {
    super(props);

    this.state = {
      isExpanded: props.defaultIsExpanded
    };
  }

  handleToggle = e => {
    this.setState({ isExpanded: !this.state.isExpanded });
  };

  render() {
    const { user, rfa, journal, reset } = this.props;
    const { isExpanded } = this.state;

    const bem = bemify('rfa-snippet');

    return (
      <Card tagName="article" className={bem``}>
        <header className={bem`__header`}>
          <h3 className={bem`__title`}>
            <Iconoclass
              iconName="rfaRound"
              size="24px"
              className={bem`__rfa-icon`}
            />
            <Hyperlink page="rfa" rfa={rfa} periodical={journal} reset={!reset}>
              <Span>{rfa.name}</Span>
            </Hyperlink>
          </h3>
          <ShareMenu
            align="right"
            name={rfa.name}
            description={rfa.description}
            url={rfa.url}
            portal={true}
          />
        </header>

        <section>
          <ExpansionPanel expanded={isExpanded} onChange={this.handleToggle}>
            <ExpansionPanelPreview>
              <span className={bem`__text-preview`}>
                <AutoAbridge ellipsis={true}>
                  {isExpanded ? 'Description' : textify(rfa.description)}
                </AutoAbridge>
              </span>
            </ExpansionPanelPreview>
            <div className={bem`__body`}>
              <section className={bem`__text`}>
                <Value>{rfa.description}</Value>
              </section>

              {!!arrayify(rfa.about).length && (
                <section className={bem`__subjects-section`}>
                  <h4 className={bem`__sub-title`}>Subjects</h4>

                  <SemanticTags
                    semanticTagsMap={getNodeMap(
                      arrayify(rfa.about).filter(
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
          <span className={bem`__footer__journal-info`}>
            <JournalBadge journal={journal} />
            {!reset && (
              <Hyperlink page="journal" periodical={journal} reset={true}>
                <Span>
                  {journal.alternateName ||
                    journal.name ||
                    unprefix(journal['@id'])}
                </Span>
              </Hyperlink>
            )}
          </span>

          <span>
            published <DateFromNow>{rfa.startTime}</DateFromNow>
          </span>

          <div className={bem`__footer__controls`}>
            <StartSubmissionButton
              user={user}
              journal={journal}
              reset={reset}
              rfaId={getId(rfa)}
            >
              Send submission
            </StartSubmissionButton>
          </div>
        </footer>
      </Card>
    );
  }
}
