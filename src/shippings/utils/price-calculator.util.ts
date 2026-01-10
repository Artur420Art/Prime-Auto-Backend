/**
 * Calculates the current price based on default price and adjustment
 * Ensures the price never goes below 0
 */
export const calculateCurrentPrice = ({
  defaultPrice,
  adjustment,
}: {
  defaultPrice: number;
  adjustment: number;
}): number => {
  return Math.max(0, defaultPrice + adjustment);
};

/**
 * Determines the source of the price
 */
export const determinePriceSource = ({
  basePrice,
  defaultPrice,
  priceAdjustment,
}: {
  basePrice: number;
  defaultPrice: number;
  priceAdjustment: number;
}): 'base' | 'admin_default' | 'user_adjusted' => {
  if (priceAdjustment !== 0) {
    return 'user_adjusted';
  }
  if (defaultPrice !== basePrice) {
    return 'admin_default';
  }
  return 'base';
};
