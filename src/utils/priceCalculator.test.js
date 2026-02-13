/**
 * Test cases for price calculator
 * Run these tests to verify the calculation logic
 */

import { calculateServicePrice, formatOfferDescription } from './priceCalculator';

// Test 1: No offer (quantity < minQuantity)
console.log('Test 1: No offer applied');
const test1 = calculateServicePrice(100, 2, [
  { minQuantity: 3, discountType: 'percentage', discountValue: 10, isActive: true }
]);
console.log('Expected: ₹200, Got:', test1.totalPrice);
console.log('Offer applied:', test1.appliedOffer ? 'Yes' : 'No');
console.log('---');

// Test 2: Percentage discount
console.log('Test 2: Percentage discount (10% off)');
const test2 = calculateServicePrice(100, 3, [
  { minQuantity: 3, discountType: 'percentage', discountValue: 10, isActive: true }
]);
console.log('Expected: ₹270 (₹90/unit), Got:', test2.totalPrice);
console.log('Savings:', test2.savings);
console.log('---');

// Test 3: Fixed amount discount
console.log('Test 3: Fixed amount discount (₹10 off per unit)');
const test3 = calculateServicePrice(100, 3, [
  { minQuantity: 3, discountType: 'fixed', discountValue: 10, isActive: true }
]);
console.log('Expected: ₹270 (₹90/unit), Got:', test3.totalPrice);
console.log('Savings:', test3.savings);
console.log('---');

// Test 4: New price
console.log('Test 4: New price (₹85/unit)');
const test4 = calculateServicePrice(100, 5, [
  { minQuantity: 5, discountType: 'newPrice', newPricePerUnit: 85, isActive: true }
]);
console.log('Expected: ₹425 (₹85/unit), Got:', test4.totalPrice);
console.log('Savings:', test4.savings);
console.log('---');

// Test 5: Multiple offers (should pick best one)
console.log('Test 5: Multiple offers');
const test5 = calculateServicePrice(100, 10, [
  { minQuantity: 3, discountType: 'percentage', discountValue: 5, isActive: true },
  { minQuantity: 5, discountType: 'percentage', discountValue: 10, isActive: true },
  { minQuantity: 10, discountType: 'newPrice', newPricePerUnit: 80, isActive: true }
]);
console.log('Expected: ₹800 (₹80/unit for 10+ units), Got:', test5.totalPrice);
console.log('Applied offer minQuantity:', test5.appliedOffer?.minQuantity);
console.log('Savings:', test5.savings);
console.log('---');

// Test 6: Inactive offer (should not apply)
console.log('Test 6: Inactive offer');
const test6 = calculateServicePrice(100, 3, [
  { minQuantity: 3, discountType: 'percentage', discountValue: 10, isActive: false }
]);
console.log('Expected: ₹300 (no offer), Got:', test6.totalPrice);
console.log('Offer applied:', test6.appliedOffer ? 'Yes' : 'No');
console.log('---');

// Test 7: Format offer descriptions
console.log('Test 7: Format offer descriptions');
console.log(formatOfferDescription({ minQuantity: 3, discountType: 'percentage', discountValue: 10 }));
console.log(formatOfferDescription({ minQuantity: 5, discountType: 'fixed', discountValue: 20 }));
console.log(formatOfferDescription({ minQuantity: 10, discountType: 'newPrice', newPricePerUnit: 75 }));
console.log('---');

console.log('✅ All tests completed!');
