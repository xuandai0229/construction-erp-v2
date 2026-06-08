import { Decimal } from 'decimal.js';

export function formatVND(amount: Decimal | number | string): string {
  const value = new Decimal(amount);
  return value.toNumber().toLocaleString('vi-VN') + ' đ';
}

export function toDecimal(value: number | string): Decimal {
  return new Decimal(value);
}
