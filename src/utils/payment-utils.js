export function getPrice(
  priceSpecification = {},
  { requestedPrice, numberOfUnit = 1 } = {}
) {
  let price =
    requestedPrice != null ? requestedPrice : priceSpecification.price;

  numberOfUnit = numberOfUnit != null ? numberOfUnit : 1;

  if (priceSpecification['@type'] === 'UnitPriceSpecification') {
    price = price * numberOfUnit;
  }

  return price;
}

export function isFree(
  priceSpecification,
  { requestedPrice, numberOfUnit } = {}
) {
  return getPrice(priceSpecification, { requestedPrice, numberOfUnit }) === 0;
}
