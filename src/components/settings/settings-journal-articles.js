import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId, unprefix, arrayify } from '@scipe/jsonld';
import { getScopeId, createId } from '@scipe/librarian';
import Iconoclass from '@scipe/iconoclass';
import { BemTags, Span, Tooltip, Spinner } from '@scipe/ui';
import { updateJournal } from '../../actions/journal-action-creators';
import {
  updateRelease,
  updateReleaseBanner
} from '../../actions/graph-action-creators';
import SearchableArticleList from '../searchable-article-list';
import {
  StyleSectionHeader,
  StyleSectionTitle,
  StyleFormSetList,
  StyleFormSetListItem,
  StyleFormSetListItemGroup,
  StyleFormSet
} from './settings';
import ArticleEditor from '../article-editor';

class SettingsJournalArticles extends React.Component {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool,
    user: PropTypes.object,
    acl: PropTypes.object.isRequired,
    journal: PropTypes.object,

    // redux
    droplets: PropTypes.object.isRequired,
    updateJournal: PropTypes.func.isRequired,
    updateRelease: PropTypes.func.isRequired,
    updateReleaseBanner: PropTypes.func.isRequired
  };

  static getDerivedStateFromProps(props, state) {
    if (getId(props.journal) !== getId(state.lastJournal)) {
      return {
        openId: null,
        lastJournal: props.journal
      };
    }
    return null;
  }

  constructor(props) {
    super(props);
    this.state = {
      openId: null,
      lastJournal: props.journal
    };
  }

  handleToggle(graph, e) {
    e.preventDefault();
    this.setState({
      openId: getId(this.state.openId) === getId(graph) ? null : getId(graph)
    });
  }

  handleToggleFeatured(graph, nextIsFeatured, e) {
    const { journal, updateJournal } = this.props;

    e.stopPropagation();
    e.preventDefault();

    let nextWorkFeatured = arrayify(journal.workFeatured).filter(
      work => getScopeId(work) !== getScopeId(graph)
    );
    if (nextIsFeatured) {
      nextWorkFeatured.push(createId('release', 'latest', graph, true)['@id']);
    }

    updateJournal(getId(journal), {
      workFeatured: nextWorkFeatured.length ? nextWorkFeatured : null
    });
  }

  render() {
    const bem = BemTags();
    const { openId } = this.state;
    const {
      journal,
      disabled: _disabled,
      user,
      acl,
      droplets,
      updateRelease,
      updateReleaseBanner
    } = this.props;

    const disabled = _disabled || !acl.checkPermission(user, 'AdminPermission');

    return (
      <section className={bem`settings-journal-articles`}>
        <StyleSectionHeader>
          <StyleSectionTitle>Articles</StyleSectionTitle>
        </StyleSectionHeader>

        <StyleFormSetList>
          <SearchableArticleList journal={journal}>
            {graphs =>
              graphs.map(graph => {
                const isFeatured = arrayify(journal.workFeatured).some(
                  work => getScopeId(work) === getScopeId(graph)
                );

                return (
                  <StyleFormSetListItem
                    active={getId(graph) === openId}
                    key={getId(graph)}
                    onClick={this.handleToggle.bind(this, graph)}
                  >
                    <StyleFormSetListItemGroup>
                      <Spinner progressMode={'none' /* TODO */}>
                        <Iconoclass
                          className={bem`__viewing-icon`}
                          iconName={getId(graph) === openId ? 'eye' : 'none'}
                          behavior="button"
                          onClick={this.handleToggle.bind(this, graph)}
                          size="16px"
                        />
                      </Spinner>

                      <span>
                        <span>{unprefix(getScopeId(graph))}</span>
                        {' — '}
                        <Span>{getTitle(graph)}</Span>
                      </span>
                    </StyleFormSetListItemGroup>

                    <StyleFormSetListItemGroup align="right">
                      <Tooltip
                        displayText={
                          isFeatured
                            ? 'featured article (click to unfeature)'
                            : 'click to mark article as featured'
                        }
                      >
                        <Iconoclass
                          behavior="toggle"
                          iconName="star"
                          checked={isFeatured}
                          disabled={disabled}
                          onClick={this.handleToggleFeatured.bind(
                            this,
                            graph,
                            !isFeatured
                          )}
                        />
                      </Tooltip>
                    </StyleFormSetListItemGroup>
                  </StyleFormSetListItem>
                );
              })
            }
          </SearchableArticleList>
        </StyleFormSetList>

        {/* Article editor */}
        {openId != null && droplets[openId] && (
          <StyleFormSet>
            <ArticleEditor
              release={droplets[openId]}
              updateRelease={updateRelease}
              updateReleaseBanner={updateReleaseBanner}
            />
          </StyleFormSet>
        )}
      </section>
    );
  }
}

export default connect(
  createSelector(
    state => state.droplets,
    droplets => {
      return { droplets };
    }
  ),
  {
    updateJournal,
    updateRelease,
    updateReleaseBanner
  }
)(SettingsJournalArticles);

function getTitle(graph) {
  const mainEntity =
    arrayify(graph['@graph']).find(
      node => getId(node) === getId(graph.mainEntity)
    ) || graph.mainEntity; // could be partially embedded
  return mainEntity && mainEntity.name;
}
