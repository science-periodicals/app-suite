import React from 'react';
import PropTypes from 'prop-types';
import tinyColor from 'tinycolor2';
import { connect } from 'react-redux';
import Iconoclass from '@scipe/iconoclass';
import { arrayify, getId } from '@scipe/jsonld';
import { ASSET_LOGO } from '@scipe/librarian';
import {
  ColorPicker,
  Dropzone,
  BemTags,
  Logo,
  LayoutWrapRows,
  LayoutWrapItem,
  PaperButton
} from '@scipe/ui';
import {
  updateJournal,
  updateJournalLogo,
  updateJournalBanner,
  upsertJournalStyle,
  resetJournalStyleOrAsset
} from '../../actions/journal-action-creators';
import JournalLargeBannerContent from '../sifter/journal-large-banner-content';
import BannerEditor from '../banner-editor';
import { StyleGroup, StyleSectionTitle, StyleSectionHeader } from './settings';

class SettingsJournalStyle extends React.Component {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool,
    user: PropTypes.object,
    acl: PropTypes.object.isRequired,
    journal: PropTypes.object,
    updateJournal: PropTypes.func.isRequired,
    updateJournalLogo: PropTypes.func.isRequired,
    updateJournalBanner: PropTypes.func.isRequired,
    upsertJournalStyle: PropTypes.func.isRequired,
    resetJournalStyleOrAsset: PropTypes.func.isRequired
  };

  static defaultProps = {
    journal: {}
  };

  handleDropLogo = files => {
    const { journal, updateJournalLogo } = this.props;
    updateJournalLogo(journal, ASSET_LOGO, files[0]);
  };

  handleChangeCssVariable(
    styleId, // may be undefined
    name,
    value
  ) {
    const { journal, upsertJournalStyle } = this.props;
    upsertJournalStyle(journal, {
      styleId,
      name,
      value
    });
  }

  handleReset(nodeKey, deletedNames) {
    const { journal, resetJournalStyleOrAsset } = this.props;
    resetJournalStyleOrAsset(journal, nodeKey, deletedNames);
  }

  handleBannerStyleChange = nextStyle => {
    const { journal, upsertJournalStyle } = this.props;
    upsertJournalStyle(journal, {
      styleId: getId(nextStyle),
      name: nextStyle.name,
      value: nextStyle.value
    });
  };

  handleBannerFileChange = (style, file) => {
    const { journal, updateJournalBanner } = this.props;
    updateJournalBanner(journal, style, file);
  };

  handleBannerReset = styles => {
    const { journal, updateJournal } = this.props;
    const nextStyles = arrayify(journal.style).filter(
      style => !styles.some(_style => getId(_style) === getId(style))
    );

    updateJournal(journal, {
      style: nextStyles.length ? nextStyles : null
    });
  };

  render() {
    const { journal, disabled: _disabled, readOnly, user, acl } = this.props;
    const disabled = _disabled || !acl.checkPermission(user, 'AdminPermission');

    const cssVariables = arrayify(journal.style);

    const accentColor = cssVariables.find(v => v.name === '--accent-color') || {
      name: '--accent-color',
      value: '#42A5F5'
    };

    const journalBadgeColor = cssVariables.find(
      v => v.name === '--journal-badge-color'
    ) || { name: '--journal-badge-color' };
    const journalBadgeColor2 = cssVariables.find(
      v => v.name === '--journal-badge-color2'
    ) || { name: '--journal-badge-color2' };

    const bem = BemTags('settings-journal-style', '@settings', '@sa');

    return (
      <section className={bem`settings-journal-style`}>
        <StyleGroup>
          <StyleSectionHeader>
            <StyleSectionTitle>Logo</StyleSectionTitle>
            <div className={bem`__banner-trash-container`}>
              <PaperButton
                disabled={disabled}
                onClick={this.handleReset.bind(this, 'logo', ASSET_LOGO)}
              >
                Reset
                <Iconoclass iconName="trash" size={'16px'} />
              </PaperButton>
            </div>
          </StyleSectionHeader>
          <div className={bem`__row`}>
            <span className={bem`@__type-notice`}>
              The logo file may be a .gif, .png, or .jpg. The minumum
              recommended dimensions are 500px wide by 100px high. It will be
              resized to fit an aspect ratio of 5:1.
            </span>
          </div>
          <div className={bem`__row`}>
            <div className={bem`__label`}>Logo Preview</div>
            <div className={bem`__header-preview`}>
              <Iconoclass
                iconName="menu"
                className={bem`__header-preview-menu`}
              />
              <div className={bem`__logo-container`}>
                <div className={bem`__logo`}>
                  <Logo className={bem`__logo-img`} logo={journal.logo} />
                </div>
                <Dropzone
                  accept="image/*"
                  onFiles={this.handleDropLogo}
                  multiple={false}
                  disabled={disabled}
                >
                  <div className={bem`logo-dropzone`}>Upload Logo</div>
                </Dropzone>
              </div>
              <div className={bem`__header-preview-crumbs`}>
                <Iconoclass iconName="home" />
                <Iconoclass iconName="arrowOpenRight" />
                {journal.name}
              </div>
            </div>
          </div>
        </StyleGroup>

        <LayoutWrapRows className={bem`__row`}>
          <LayoutWrapItem>
            <StyleGroup>
              <StyleSectionHeader>
                <StyleSectionTitle>Journal Badge Color</StyleSectionTitle>
                <div className={bem`__banner-trash-container`}>
                  <PaperButton
                    disabled={disabled}
                    onClick={this.handleReset.bind(
                      this,
                      'style',
                      cssVariables
                        .filter(
                          style =>
                            style.name &&
                            style.name.startsWith('--journal-badge-color')
                        )
                        .map(style => style.name)
                    )}
                  >
                    Reset
                    <Iconoclass iconName="trash" size={'16px'} />
                  </PaperButton>
                </div>
              </StyleSectionHeader>

              <LayoutWrapRows>
                <LayoutWrapItem>
                  {/* Journal badge  color */}
                  <ColorPicker
                    onChange={this.handleChangeCssVariable.bind(
                      this,
                      getId(journalBadgeColor),
                      journalBadgeColor.name
                    )}
                    large={true}
                    disabled={disabled}
                    readOnly={readOnly}
                    id="badge-color-a"
                    label="Badge Color A"
                    color={journalBadgeColor.value}
                    paletteHashSeed={journal.name}
                    showAlpha={false}
                  />
                </LayoutWrapItem>
                <LayoutWrapItem>
                  <ColorPicker
                    onChange={this.handleChangeCssVariable.bind(
                      this,
                      getId(journalBadgeColor2),
                      journalBadgeColor2.name
                    )}
                    large={true}
                    disabled={disabled}
                    readOnly={readOnly}
                    id="badge-color-b"
                    label="Badge Color B"
                    color={journalBadgeColor2.value || journalBadgeColor.value}
                    complimentColor={journalBadgeColor.value}
                    palette={Array.from(
                      new Set(
                        [journalBadgeColor.value, journalBadgeColor2.value]
                          .concat(
                            journalBadgeColor2.value
                              ? tinyColor(journalBadgeColor2.value)
                                  .triad()
                                  .slice(0, 3)
                                  .map(c => c.toString())
                              : []
                          )
                          .filter(c => c)
                      )
                    )}
                    showAlpha={false}
                  />
                </LayoutWrapItem>
              </LayoutWrapRows>
              <p className={bem`__text`}>
                Select colors for the Journal Badge. The Journal Badge is used
                to identify your journal throughout the website.
              </p>
            </StyleGroup>
          </LayoutWrapItem>

          <LayoutWrapItem>
            <StyleGroup>
              <StyleSectionHeader>
                <h3 className={bem`@__section-title`}>Journal Accent Color</h3>
                <div className={bem`__banner-trash-container`}>
                  <PaperButton
                    disabled={disabled}
                    onClick={this.handleReset.bind(
                      this,
                      'style',
                      cssVariables
                        .filter(
                          style =>
                            style.name &&
                            style.name.startsWith('--accent-color')
                        )
                        .map(style => style.name)
                    )}
                  >
                    Reset
                    <Iconoclass iconName="trash" size={'16px'} />
                  </PaperButton>
                </div>
              </StyleSectionHeader>

              <div className={bem`__row`}>
                <div className={bem`__color-picker --accent`}>
                  {/* Accent color */}
                  <ColorPicker
                    onChange={this.handleChangeCssVariable.bind(
                      this,
                      getId(accentColor),
                      accentColor.name
                    )}
                    large={true}
                    disabled={disabled}
                    readOnly={readOnly}
                    color={accentColor.value}
                    complimentColor={journalBadgeColor.value}
                    id="accent-color"
                    label="Accent Color"
                    palette={['#42A5F5']}
                    showAlpha={false}
                  />
                </div>
                <p className={bem`__text`}>
                  Select an accent color for your journal. The accent color is
                  used to help brand your user-experience.
                </p>
              </div>
            </StyleGroup>
          </LayoutWrapItem>
        </LayoutWrapRows>

        {/* TODO update to BannerEditor with type === 'large' */}
        <StyleGroup>
          <BannerEditor
            type="large"
            label="Journal Banner"
            namePreview="Journal Name"
            descriptionPreview="Journal Description"
            disabled={disabled}
            cssVariables={journal.style}
            onStyleChange={this.handleBannerStyleChange}
            onFileChange={this.handleBannerFileChange}
            onReset={this.handleBannerReset}
          >
            <JournalLargeBannerContent journal={journal} />
          </BannerEditor>
        </StyleGroup>
      </section>
    );
  }
}

export default connect(
  null,
  {
    updateJournal,
    updateJournalLogo,
    updateJournalBanner,
    upsertJournalStyle,
    resetJournalStyleOrAsset
  }
)(SettingsJournalStyle);
