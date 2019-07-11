import React from 'react';
import PropTypes from 'prop-types';
import {
  PaperButton,
  LayoutWrapRows,
  LayoutWrapItem,
  ColorPicker,
  Banner,
  Dropzone,
  bemify
} from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';
import { StyleSectionTitle, StyleSectionHeader } from './settings/settings';
import Notice from './notice';

export default class BannerEditor extends React.Component {
  static propTypes = {
    type: PropTypes.oneOf(['large', 'medium', 'small']).isRequired,
    theme: PropTypes.oneOf(['light', 'dark', 'alt']),
    cssVariables: PropTypes.arrayOf(PropTypes.object),
    disabled: PropTypes.bool,
    readOnly: PropTypes.bool,
    onStyleChange: PropTypes.func.isRequired,
    onFileChange: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired,
    label: PropTypes.string,
    description: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
    recommendedWidth: PropTypes.number,
    recommendedHeight: PropTypes.number,
    children: PropTypes.any
  };

  static defaultProps = {
    name: 'Banner',
    theme: 'light',
    recommendedWidth: 2000,
    recommendedHeight: 500,
    cssVariables: []
  };

  handleStyleChange(style, nextValue) {
    const { onStyleChange } = this.props;
    onStyleChange(
      Object.assign({ '@type': 'CssVariable' }, style, { value: nextValue })
    );
  }

  handleFile(style, files) {
    const { onFileChange } = this.props;
    onFileChange(style, files[0]);
  }

  handleReset(styles) {
    const { onReset } = this.props;
    onReset(styles);
  }

  render() {
    const {
      label,
      description,
      type,
      cssVariables,
      readOnly,
      disabled,
      recommendedWidth,
      recommendedHeight,
      children,
      theme
    } = this.props;
    const bem = bemify('banner-editor');

    const bannerBackgroundImage = cssVariables.find(
      v => v.name === `--${type}-banner-background-image`
    ) || { name: `--${type}-banner-background-image` };
    const bannerTextColor = cssVariables.find(
      v => v.name === `--${type}-banner-text-color`
    ) || { name: `--${type}-banner-text-color` };
    const bannerTextShadowColor = cssVariables.find(
      v => v.name === `--${type}-banner-text-shadow-color`
    ) || { name: `--${type}-banner-text-shadow-color` };

    return (
      <div className={bem` --${type}`}>
        <StyleSectionHeader>
          <StyleSectionTitle>{label}</StyleSectionTitle>

          <div className={bem`__trash-container`}>
            <PaperButton
              disabled={disabled}
              onClick={this.handleReset.bind(
                this,
                cssVariables.filter(
                  style =>
                    style.name && style.name.startsWith(`--${type}-banner`)
                )
              )}
            >
              Reset
              <Iconoclass iconName="trash" size={'16px'} />
            </PaperButton>
          </div>
        </StyleSectionHeader>

        <div className={bem`__row`}>
          {!!description && <Notice>{description}</Notice>}

          <p className={bem`__text`}>
            Minimum recommended dimensions: {recommendedWidth}px wide by{' '}
            {recommendedHeight}px high.
          </p>
        </div>

        <LayoutWrapRows className={bem`__row`}>
          <LayoutWrapItem>
            {/* Banner text color */}
            <ColorPicker
              disabled={disabled}
              readOnly={readOnly}
              onChange={this.handleStyleChange.bind(this, bannerTextColor)}
              showInput={false}
              showAlpha={false}
              palette={['#000', '#FFF']}
              color={bannerTextColor.value}
              label="Text Color"
              large={true}
            />
          </LayoutWrapItem>

          <LayoutWrapItem>
            {/* Banner text shadow color */}
            <ColorPicker
              disabled={disabled}
              readOnly={readOnly}
              onChange={this.handleStyleChange.bind(
                this,
                bannerTextShadowColor
              )}
              showInput={false}
              palette={['#000', '#FFF']}
              color={bannerTextShadowColor.value}
              label="Text Shadow Color"
              large={true}
              showAlpha={true}
            />
          </LayoutWrapItem>
        </LayoutWrapRows>

        <div className={bem`__preview __preview--${type}`}>
          <div className={bem`__preview-img-container`}>
            <Banner cssVariables={cssVariables} type={type} theme={theme}>
              {children}
            </Banner>

            <Dropzone
              disabled={disabled}
              accept="image/*"
              onFiles={this.handleFile.bind(this, bannerBackgroundImage)}
              multiple={false}
            >
              Upload Banner Background
            </Dropzone>
          </div>
        </div>
      </div>
    );
  }
}
