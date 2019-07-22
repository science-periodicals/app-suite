import React from 'react';
import PropTypes from 'prop-types';
import { getId, arrayify } from '@scipe/jsonld';
import BannerEditor from './banner-editor';
import FeaturedArticleBannerContent from './sifter/featured-article-banner-content';
import ArticleMediumBannerContent from './sifter/article-medium-banner-content';
import ArticleLargeBannerContent from './sifter/article-large-banner-content';

export default class ArticleEditor extends React.Component {
  static propTypes = {
    disabled: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool,
    release: PropTypes.object.isRequired,
    updateRelease: PropTypes.func.isRequired,
    updateReleaseBanner: PropTypes.func.isRequired
  };

  handleBannerStyleChange = nextStyle => {
    const { release, updateRelease } = this.props;
    updateRelease(release, {
      style: arrayify(release.style)
        .filter(
          style =>
            getId(style) !== getId(nextStyle) && style.name !== nextStyle.name
        )
        .concat(nextStyle)
    });
  };

  handleBannerFileChange = (style, file) => {
    const { release, updateReleaseBanner } = this.props;
    updateReleaseBanner(release, style, file);
  };

  handleBannerReset = styles => {
    const { release, updateRelease } = this.props;
    const nextStyles = arrayify(release.style).filter(
      style => !styles.some(_style => getId(_style) === getId(style))
    );

    updateRelease(release, {
      style: nextStyles.length ? nextStyles : null
    });
  };

  render() {
    const { release, disabled, readOnly } = this.props;

    return (
      <div className="article-editor">
        <BannerEditor
          type="small"
          label="Featured article banner (small)"
          description="Displayed on the right panel of journal or issue homepages to emphasize featured articles"
          recommendedWidth={700}
          recommendedHeight={500}
          cssVariables={release.style}
          onStyleChange={this.handleBannerStyleChange}
          onFileChange={this.handleBannerFileChange}
          onReset={this.handleBannerReset}
          disabled={disabled}
          readOnly={readOnly}
        >
          <FeaturedArticleBannerContent release={release} />
        </BannerEditor>

        <BannerEditor
          type="medium"
          label="Article banner (medium)"
          description="Displayed to emphasize the article in the context of search results"
          cssVariables={release.style}
          onStyleChange={this.handleBannerStyleChange}
          onFileChange={this.handleBannerFileChange}
          onReset={this.handleBannerReset}
          disabled={disabled}
          readOnly={readOnly}
        >
          <ArticleMediumBannerContent release={release} />
        </BannerEditor>

        <BannerEditor
          type="large"
          label="Article homepage banner (large)"
          description="Displayed in the main header of the article page"
          cssVariables={release.style}
          onStyleChange={this.handleBannerStyleChange}
          onFileChange={this.handleBannerFileChange}
          onReset={this.handleBannerReset}
          disabled={disabled}
          readOnly={readOnly}
        >
          <ArticleLargeBannerContent release={release} />
        </BannerEditor>
      </div>
    );
  }
}
