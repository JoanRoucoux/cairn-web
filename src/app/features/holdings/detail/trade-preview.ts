export type BuyPreview = {
  quantityAfter: number;
  averageCostAfter: number;
  amount: number;
};

export const buyPreview = (
  heldQuantity: number,
  averageCost: number | null,
  quantity: number,
  unitPrice: number,
): BuyPreview => {
  const quantityAfter = heldQuantity + quantity;
  const averageCostAfter =
    averageCost === null ? unitPrice : (heldQuantity * averageCost + quantity * unitPrice) / quantityAfter;

  return { quantityAfter, averageCostAfter, amount: quantity * unitPrice };
};

export type SellPreview = {
  quantityAfter: number;
  closesHolding: boolean;
  realizedGain: number | null;
  amount: number | null;
};

export const sellPreview = (
  heldQuantity: number,
  averageCost: number | null,
  price: number | null,
  quantity: number,
): SellPreview => {
  const quantityAfter = heldQuantity - quantity;

  return {
    quantityAfter,
    closesHolding: quantityAfter <= 0,
    realizedGain: averageCost === null || price === null ? null : quantity * (price - averageCost),
    amount: price === null ? null : quantity * price,
  };
};
