import { PRINT_RESOLUTION } from '../constants';

/**
 *  A set of utility functions for  grid or fist-fit image layout
 *  NOTE: most of these work with the size object (or an array of size objects) returned from getEncodingSize found in app-suite/utils/image-object.js
 *  The object is in the shape of:
 *  {
 *    height: undefined,
 *    width: undefined,
 *    resolution: undefined,
 *    units: undefined,
 *    heightResolution: undefined,
 *    widthResolution: undefined,
 *    heightInches: undefined,
 *    widthInches: undefined
 *  };
 */

/**
 * test if array of sizes composes a regular grid.
 * First make sure there are an even number of images and then make sure they are all about the same size.
 */
export function isRegularGrid(sizesArray, allowedVariance = 0.2) {
  if (sizesArray.length % 2 !== 0) {
    return false;
  }

  return allSizesAreAproxTheSame(sizesArray, allowedVariance);
}

/**
 *  compare all size objects in an array and see if they are about the same
 */
export function allSizesAreAproxTheSame(sizesArray, allowedVariance = 0.2) {
  return sizesArray.every(sizeA => {
    return sizesArray.every(sizeB => {
      const isSame = sizesAreAproxTheSame(sizeA, sizeB, allowedVariance);
      return isSame;
    });
  });
}

/**
 *  compare two size objects and see if they are about the same
 */
export function sizesAreAproxTheSame(sizeA, sizeB, allowedVariance = 0.2) {
  // special case: if aspect ratio is close enough we return true

  if (sizeA.height && sizeA.width && sizeB.height && sizeB.width) {
    const arA = sizeA.height / sizeA.width;
    const arB = sizeB.height / sizeB.width;
    if (dimensionsAreAproxTheSame(arA, arB, allowedVariance)) {
      return true;
    }
  }

  if (
    sizeA.heightInches &&
    sizeA.widthInches &&
    sizeB.heightInches &&
    sizeB.widthInches
  ) {
    if (
      !dimensionsAreAproxTheSame(
        sizeA.widthInches,
        sizeB.widthInches,
        allowedVariance
      )
    ) {
      return false;
    }

    if (
      !dimensionsAreAproxTheSame(
        sizeA.heightInches,
        sizeB.heightInches,
        allowedVariance
      )
    ) {
      return false;
    }

    return true;
  }

  return false;
}

/**
 *  compares two dimensions and finds if their difference is within the percentage range of allowedVariance
 */
export function dimensionsAreAproxTheSame(dimA, dimB, allowedVariance = 0.2) {
  const dif = Math.abs(dimA - dimB);
  // make dif a percetnage of the average size of the two dims
  // TODO - better to compare the dims independantly?
  const difPercent = dif / ((dimA + dimB) / 2);
  if (difPercent <= allowedVariance) {
    return true;
  }
  return false;
}

/**
 *  Adjust resolution for an array of Size Objects.
 */
export function normalizeSizesForPrint(sizes, res = PRINT_RESOLUTION) {
  let heightScaleFactor = 1;
  let widthScaleFactor = 1;

  // make sure we have all the necessary info.
  const hasAllData = sizes.every(size => {
    return (
      size.heightResolution && size.height && size.widthResolution && size.width
    );
  });

  if (hasAllData === false) {
    return false;
  }

  return sizes.map(size => {
    // we will mutate `size` so we create a shallow clone
    size = Object.assign({}, size);

    if (size.heightResolution && size.heightResolution < res) {
      heightScaleFactor = size.heightResolution / res;
      size.heightResolution = res;
      size.heightInches = size.height / res;
    }
    if (size.widthResolution && size.widthResolution < res) {
      widthScaleFactor = size.widthResolution / res;
      size.widthResolution = res;
      size.widthInches = size.width / res;
    }

    size.resolution = `${size.heightResolution}x${size.widthResolution}`;
    size.scaleFactor = Math.min(heightScaleFactor, widthScaleFactor);

    return size;
  });
}

export function getRegularGridLayout(
  sizesArr,
  containerWidth,
  containerResolution = PRINT_RESOLUTION,
  allowedVariance = 0.2
) {
  const avgWidth = getAverageInchWidth(sizesArr);
  const containerInchWidth = containerWidth / containerResolution;

  // special case if allSizesAreAproxTheSame return a square or closest thing possible to square biasing toward more rows than cols
  if (
    sizesArr.length > 2 &&
    allSizesAreAproxTheSame(sizesArr, allowedVariance)
  ) {
    const nRows = Math.ceil(Math.sqrt(sizesArr.length));
    const nMinCols = Math.floor(Math.sqrt(sizesArr.length));

    return {
      rows: nRows,
      cols: nRows * nMinCols >= sizesArr.length ? nMinCols : nRows
    };
  }

  //  Look at all col x row options and finds the best fit

  let colCount = 1;
  // let totalWidth = 0;
  // sizesArr.forEach(size => {
  //   totalWidth += size.widthInches;
  // });
  // const avgWidth = totalWidth / sizesArr.length;

  let closestFitDif = Math.abs(containerWidth - avgWidth);

  for (let i = 1; i <= sizesArr.length; i++) {
    let sizeDif = Math.abs(containerInchWidth / i - avgWidth);
    if (sizesArr.length % i === 0 && sizeDif < closestFitDif) {
      colCount = i;
      closestFitDif = sizeDif;
    }
  }

  const rowCount = sizesArr.length / colCount;

  return { cols: colCount, rows: rowCount };
}

function getAverageInchWidth(sizesArr) {
  const totalWidth = sizesArr.reduce((acc, curr, i) => {
    return acc + curr.widthInches;
  }, 0);
  const avgWidth = totalWidth / sizesArr.length;
  return avgWidth;
}

/**
 * Modified first fit layout - this will create rows of aprox equal height,
 * fitting images according to the container width
 **/
export function firstFitRowLayout(
  sizeArrayA,
  containerWidth,
  containerRes,
  allowedVariance = 0.2
) {
  let rows = [];
  let rowIndex = 0;
  const containerInchWidth = containerWidth / containerRes;

  for (let i = 0; i < sizeArrayA.length; i++) {
    let sizeA = sizeArrayA[i];

    // check for new row
    if (!Array.isArray(rows[rowIndex])) {
      // this is a new row so add image
      rows = addImageToRow(rows, sizeA, rowIndex);
    }

    for (let j = i + 1; j < sizeArrayA.length; j++) {
      let currentRow = rows[rowIndex];

      // look at next image and see if it's about the same height - of so, we'll add to the row
      if (
        dimensionsAreAproxTheSame(
          sizeA.heightInches,
          sizeArrayA[j].heightInches
        )
      ) {
        // images are aprox the same height, see if they will fit in the current row.

        let rowWidth = 0;
        if (Array.isArray(currentRow)) {
          currentRow.forEach(sizeInRow => {
            rowWidth += sizeInRow.widthInches;
          });
        }
        rowWidth += sizeArrayA[j].widthInches;
        if (rowWidth <= containerInchWidth) {
          // width of all images in row is still less than container width, so add new image to row
          rows = addImageToRow(rows, sizeArrayA[j], rowIndex);
          i = j;
        } else {
          // adding new image would exceed the width of container, so wrap to new rows
          rowIndex++;
          break;
        }
      } else {
        // height are not aprox the same, so start new rows
        rowIndex++;
        break;
      }
    }
  }
  return rows;
}

function addImageToRow(rows, newSize, rowIndex) {
  if (!Array.isArray(rows[rowIndex])) {
    rows[rowIndex] = [];
  }
  rows[rowIndex].push(newSize);
  return rows;
}
