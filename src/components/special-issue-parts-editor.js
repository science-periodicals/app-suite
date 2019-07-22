import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import Iconoclass from '@scipe/iconoclass';
import { getRootPartId, getScopeId, createId } from '@scipe/librarian';
import { arrayify, getId, unprefix } from '@scipe/jsonld';
import { JournalArticleAutocomplete, Span, Tooltip } from '@scipe/ui';
import Droplet from './droplet';
import {
  StyleFormSetListItem,
  StyleFormSetListItemGroup,
  StyleFormSetOrderedList
} from './settings/settings';

// TODO DnD for the parts

export default class SpecialIssuePartsEditor extends React.Component {
  static propTypes = {
    issue: PropTypes.object,
    disabled: PropTypes.bool,
    readOnly: PropTypes.bool,
    onUpdate: PropTypes.func.isRequired // f(nextParts)
  };

  static defaultProps = {
    issue: {}
  };

  constructor(props) {
    super(props);
    this.autocompleteRef = React.createRef();
  }

  handleAddPart = (value, item) => {
    const { onUpdate, issue } = this.props;

    if (item) {
      const updatePayload = {
        hasPart: arrayify(issue.hasPart)
          .filter(part => getScopeId(part) !== getScopeId(item))
          .map(part => getId(part))
          .filter(Boolean)
          .concat(createId('release', 'latest', item, true)['@id'])
      };

      onUpdate(updatePayload);
      this.autocompleteRef.current.reset();
    }
  };

  handleRemovePart(part) {
    const { onUpdate, issue } = this.props;
    const nextParts = arrayify(issue.hasPart).filter(
      _part => getScopeId(_part) !== getScopeId(part)
    );

    const updatePayload = {
      hasPart: nextParts && nextParts.length ? nextParts.map(getId) : null
    };

    onUpdate(updatePayload);
  }

  handleToggleFeaturedIssue(releaseId, nextIsFeatured, e) {
    const { onUpdate, issue } = this.props;

    // be sure that version is ?version=latest;
    releaseId = createId('release', 'latest', releaseId)['@id'];

    let nextWorkFeatured = arrayify(issue.workFeatured).filter(
      work => getId(work) !== releaseId
    );
    if (nextIsFeatured) {
      nextWorkFeatured.push(releaseId);
    }

    onUpdate({
      workFeatured: nextWorkFeatured.length ? nextWorkFeatured : null
    });
  }

  render() {
    const { issue, disabled, readOnly } = this.props;
    const journalId = getRootPartId(issue);

    const parts = arrayify(issue.hasPart);

    return (
      <div className="special-issue-parts-editor">
        <StyleFormSetOrderedList>
          {parts.map(part => {
            const isFeatured = arrayify(issue.workFeatured).some(
              work => getScopeId(work) === getScopeId(part)
            );

            return (
              <Droplet key={getId(part)} node={part}>
                {release => (
                  <StyleFormSetListItem key={getId(release)}>
                    <StyleFormSetListItemGroup>
                      <a href={release.url}>
                        <span>
                          {release.slug || unprefix(getScopeId(release))}
                        </span>
                        {' — '}
                        <Span>{getTitle(release)}</Span>
                      </a>
                    </StyleFormSetListItemGroup>

                    <StyleFormSetListItemGroup align="right">
                      <Span>
                        {moment(release.datePublished).format('MMMM Do YYYY')}
                      </Span>

                      <Tooltip
                        displayText={
                          isFeatured
                            ? 'featured article (click to unfeature)'
                            : 'click to mark article as featured in the issue'
                        }
                      >
                        <Iconoclass
                          behavior="toggle"
                          iconName="star"
                          disabled={disabled}
                          checked={isFeatured}
                          onClick={this.handleToggleFeaturedIssue.bind(
                            this,
                            getId(release),
                            !isFeatured
                          )}
                        />
                      </Tooltip>

                      {!readOnly &&
                        issue['@type'] === 'SpecialPublicationIssue' && (
                          <Iconoclass
                            behavior="button"
                            iconName="delete"
                            disabled={disabled}
                            onClick={this.handleRemovePart.bind(this, part)}
                          />
                        )}
                    </StyleFormSetListItemGroup>
                  </StyleFormSetListItem>
                )}
              </Droplet>
            );
          })}
        </StyleFormSetOrderedList>

        {!readOnly && issue['@type'] === 'SpecialPublicationIssue' && (
          <JournalArticleAutocomplete
            ref={this.autocompleteRef}
            label="Add article"
            name="hasPart"
            journalId={journalId}
            blacklist={parts.map(getScopeId)}
            disabled={disabled}
            readOnly={readOnly}
            onSubmit={this.handleAddPart}
          />
        )}
      </div>
    );
  }
}

function getTitle(release) {
  const mainEntity =
    arrayify(release['@graph']).find(
      node => getId(node) === getId(release.mainEntity)
    ) || release.mainEntity; // could be partially embedded
  return mainEntity && mainEntity.name;
}
