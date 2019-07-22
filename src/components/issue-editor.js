import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { parseIndexableString } from '@scipe/collate';
import { unprefix, getId, arrayify, textify } from '@scipe/jsonld';
import { createId, getScopeId } from '@scipe/librarian';
import {
  PaperDateInput,
  PaperTimeInput,
  MenuItem,
  Span,
  Value,
  RichTextarea,
  PaperInput,
  withOnSubmit,
  LayoutWrapRows,
  LayoutWrapItem,
  Tooltip
} from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';
import BannerEditor from './banner-editor';
import SpecialIssuePartsEditor from './special-issue-parts-editor';
import {
  StyleSection,
  StyleRow,
  StyleSectionHeader,
  StyleSectionTitle,
  StyleFormSetOrderedList,
  StyleFormSetListItem,
  StyleFormSetListItemGroup
} from './settings/settings';
import SearchableArticleList from './searchable-article-list';
import Notice from './notice';

import FeaturedIssueBannerContent from './sifter/featured-issue-banner-content';
import IssueMediumBannerContent from './sifter/issue-medium-banner-content';
import IssueLargeBannerContent from './sifter/issue-large-banner-content';

const ControledPaperInput = withOnSubmit(PaperInput);

export default class IssueEditor extends React.Component {
  static propTypes = {
    readOnly: PropTypes.bool,
    disabled: PropTypes.bool,
    journal: PropTypes.object.isRequired,
    issue: PropTypes.object.isRequired,
    updateIssue: PropTypes.func.isRequired,
    updateIssueBanner: PropTypes.func.isRequired
  };

  handleDatePublished = nextDate => {
    const { issue, updateIssue } = this.props;
    updateIssue(issue, {
      datePublished: nextDate.toISOString()
    });
  };

  handleUpdate = e => {
    const { issue, updateIssue } = this.props;
    updateIssue(issue, {
      [e.target.name]: e.target.value
    });
  };

  handleBannerStyleChange = nextStyle => {
    const { issue, updateIssue } = this.props;
    updateIssue(issue, {
      style: arrayify(issue.style)
        .filter(
          style =>
            getId(style) !== getId(nextStyle) && style.name !== nextStyle.name
        )
        .concat(nextStyle)
    });
  };

  handleBannerFileChange = (style, file) => {
    const { issue, updateIssueBanner } = this.props;
    updateIssueBanner(issue, style, file);
  };

  handleBannerReset = styles => {
    const { issue, updateIssue } = this.props;
    const nextStyles = arrayify(issue.style).filter(
      style => !styles.some(_style => getId(_style) === getId(style))
    );

    updateIssue(issue, {
      style: nextStyles.length ? nextStyles : null
    });
  };

  handlePartUpdate = updatePayload => {
    const { issue, updateIssue } = this.props;

    updateIssue(issue, updatePayload);
  };

  handleToggleFeaturedArticle(releaseId, nextIsFeatured, e) {
    const { updateIssue, issue } = this.props;

    // be sure that version is ?version=latest;
    releaseId = createId('release', 'latest', releaseId)['@id'];

    let nextWorkFeatured = arrayify(issue.workFeatured).filter(
      work => getId(work) !== releaseId
    );
    if (nextIsFeatured) {
      nextWorkFeatured.push(releaseId);
    }

    const updatePayload = {
      workFeatured: nextWorkFeatured.length ? nextWorkFeatured : null
    };
    updateIssue(issue, updatePayload);
  }

  render() {
    const { journal, disabled, readOnly, issue } = this.props;
    const [, , flag] = parseIndexableString(issue._id);

    const canEditDatePublished =
      issue['@type'] === 'SpecialPublicationIssue' ||
      (issue['@type'] === 'PublicationIssue' && flag === 'latest');

    return (
      <div className="issue-editor">
        <StyleSectionHeader>
          <StyleSectionTitle>
            {issue['@type'] === 'PublicationIssue' ? (
              <span>Issue number {issue.issueNumber}</span>
            ) : (
              <Value tagName="span">
                {issue.name || unprefix(getId(issue)).split('/', 2)[1]}
              </Value>
            )}
          </StyleSectionTitle>
        </StyleSectionHeader>

        <StyleRow>
          <ControledPaperInput
            label="name"
            name="name"
            disabled={disabled}
            readOnly={readOnly}
            value={textify(issue.name)}
            onSubmit={this.handleUpdate}
          />
        </StyleRow>

        <StyleRow>
          <LayoutWrapRows>
            <LayoutWrapItem>
              <PaperDateInput
                data-test-now="true"
                label="Publication Date"
                name="date"
                value={new Date(issue.datePublished)}
                disabled={disabled || !canEditDatePublished}
                onSubmit={this.handleDatePublished}
              />
            </LayoutWrapItem>
            <LayoutWrapItem>
              <PaperTimeInput
                data-test-now="true"
                label="Publication Time"
                name="time"
                disabled={disabled || !canEditDatePublished}
                readOnly={readOnly}
                onSubmit={this.handleDatePublished}
                value={new Date(issue.datePublished)}
              >
                <MenuItem value="09:00">
                  <span style={{ color: 'grey' }}>09:00 AM </span> Morning
                </MenuItem>
                <MenuItem value="12:00">
                  <span style={{ color: 'grey' }}>12:00 PM </span> Afternoon
                </MenuItem>
                <MenuItem value="18:00">
                  <span style={{ color: 'grey' }}>06:00 PM </span> Evening
                </MenuItem>
              </PaperTimeInput>
            </LayoutWrapItem>
          </LayoutWrapRows>
        </StyleRow>

        <StyleRow>
          <RichTextarea
            label="Description"
            name="description"
            schema="single"
            defaultValue={issue.description}
            onSubmit={this.handleUpdate}
            disabled={disabled}
            readOnly={readOnly}
          />
        </StyleRow>

        {/* Banner */}
        <StyleSection>
          <BannerEditor
            type="small"
            label="Featured issue banner (small)"
            description="Displayed on the right panel of journal or issue homepages to emphasize featured issues"
            disabled={disabled}
            readOnly={readOnly}
            recommendedWidth={700}
            recommendedHeight={500}
            cssVariables={issue.style}
            onStyleChange={this.handleBannerStyleChange}
            onFileChange={this.handleBannerFileChange}
            onReset={this.handleBannerReset}
          >
            <FeaturedIssueBannerContent issue={issue} journal={journal} />
          </BannerEditor>
        </StyleSection>

        <StyleSection>
          <BannerEditor
            type="medium"
            label="Issue banner (medium)"
            description="Displayed to emphasize the issue in the context of search results"
            disabled={disabled}
            readOnly={readOnly}
            cssVariables={issue.style}
            onStyleChange={this.handleBannerStyleChange}
            onFileChange={this.handleBannerFileChange}
            onReset={this.handleBannerReset}
          >
            <IssueMediumBannerContent
              issue={issue}
              journal={journal}
              link={false}
            />
          </BannerEditor>
        </StyleSection>

        <StyleSection>
          <BannerEditor
            type="large"
            label="Issue homepage banner (large)"
            description="Displayed in the main header of the issue page"
            disabled={disabled}
            readOnly={readOnly}
            cssVariables={issue.style}
            onStyleChange={this.handleBannerStyleChange}
            onFileChange={this.handleBannerFileChange}
            onReset={this.handleBannerReset}
          >
            <IssueLargeBannerContent issue={issue} journal={journal} />
          </BannerEditor>
        </StyleSection>

        {/* list of articles */}
        <StyleSection>
          <StyleSectionHeader>
            <StyleSectionTitle>Articles</StyleSectionTitle>
          </StyleSectionHeader>

          <Notice>
            Click on the star icon to mark articles as featured articles of the
            issue.
          </Notice>

          {issue['@type'] === 'PublicationIssue' ? (
            <SearchableArticleList journal={journal} issue={issue}>
              {releases => (
                <StyleFormSetOrderedList>
                  {releases.map(release => {
                    const isFeatured = arrayify(issue.workFeatured).some(
                      work => getScopeId(work) === getScopeId(release)
                    );
                    return (
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
                            {moment(release.datePublished).format(
                              'MMMM Do YYYY'
                            )}
                          </Span>

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
                              disabled={disabled}
                              checked={isFeatured}
                              onClick={this.handleToggleFeaturedArticle.bind(
                                this,
                                getId(release),
                                !isFeatured
                              )}
                            />
                          </Tooltip>
                        </StyleFormSetListItemGroup>
                      </StyleFormSetListItem>
                    );
                  })}
                </StyleFormSetOrderedList>
              )}
            </SearchableArticleList>
          ) : (
            <SpecialIssuePartsEditor
              issue={issue}
              disabled={disabled}
              readOnly={readOnly}
              onUpdate={this.handlePartUpdate}
            />
          )}
        </StyleSection>
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
