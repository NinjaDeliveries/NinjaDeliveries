/**
 * Test Script for Date Helpers
 * Run this in browser console to verify date functions work correctly
 */

import {
  getTodayIST,
  getTomorrowIST,
  getYesterdayIST,
  toISTDateString,
  isToday,
  isPast,
  isFuture,
  formatDateForDisplay,
  getRelativeDateLabel,
  compareDates,
  formatTime12Hour
} from './dateHelpers';

/**
 * Run all tests
 */
export function runDateHelperTests() {
  console.log('🧪 Running Date Helper Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: getTodayIST returns YYYY-MM-DD format
  console.log('Test 1: getTodayIST format');
  const today = getTodayIST();
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (dateRegex.test(today)) {
    console.log('✅ PASS: getTodayIST() =', today);
    passed++;
  } else {
    console.log('❌ FAIL: Invalid format:', today);
    failed++;
  }
  
  // Test 2: getTomorrowIST is one day after today
  console.log('\nTest 2: getTomorrowIST');
  const tomorrow = getTomorrowIST();
  if (dateRegex.test(tomorrow) && tomorrow > today) {
    console.log('✅ PASS: getTomorrowIST() =', tomorrow);
    passed++;
  } else {
    console.log('❌ FAIL: Invalid tomorrow:', tomorrow);
    failed++;
  }
  
  // Test 3: getYesterdayIST is one day before today
  console.log('\nTest 3: getYesterdayIST');
  const yesterday = getYesterdayIST();
  if (dateRegex.test(yesterday) && yesterday < today) {
    console.log('✅ PASS: getYesterdayIST() =', yesterday);
    passed++;
  } else {
    console.log('❌ FAIL: Invalid yesterday:', yesterday);
    failed++;
  }
  
  // Test 4: isToday works correctly
  console.log('\nTest 4: isToday');
  if (isToday(today) && !isToday(tomorrow) && !isToday(yesterday)) {
    console.log('✅ PASS: isToday works correctly');
    console.log('  - isToday(today):', isToday(today));
    console.log('  - isToday(tomorrow):', isToday(tomorrow));
    console.log('  - isToday(yesterday):', isToday(yesterday));
    passed++;
  } else {
    console.log('❌ FAIL: isToday not working correctly');
    failed++;
  }
  
  // Test 5: isPast works correctly
  console.log('\nTest 5: isPast');
  if (isPast(yesterday) && !isPast(today) && !isPast(tomorrow)) {
    console.log('✅ PASS: isPast works correctly');
    console.log('  - isPast(yesterday):', isPast(yesterday));
    console.log('  - isPast(today):', isPast(today));
    console.log('  - isPast(tomorrow):', isPast(tomorrow));
    passed++;
  } else {
    console.log('❌ FAIL: isPast not working correctly');
    failed++;
  }
  
  // Test 6: isFuture works correctly
  console.log('\nTest 6: isFuture');
  if (isFuture(tomorrow) && !isFuture(today) && !isFuture(yesterday)) {
    console.log('✅ PASS: isFuture works correctly');
    console.log('  - isFuture(tomorrow):', isFuture(tomorrow));
    console.log('  - isFuture(today):', isFuture(today));
    console.log('  - isFuture(yesterday):', isFuture(yesterday));
    passed++;
  } else {
    console.log('❌ FAIL: isFuture not working correctly');
    failed++;
  }
  
  // Test 7: toISTDateString converts Date object
  console.log('\nTest 7: toISTDateString');
  const dateObj = new Date();
  const converted = toISTDateString(dateObj);
  if (dateRegex.test(converted)) {
    console.log('✅ PASS: toISTDateString(Date) =', converted);
    passed++;
  } else {
    console.log('❌ FAIL: Invalid conversion:', converted);
    failed++;
  }
  
  // Test 8: toISTDateString handles string input
  console.log('\nTest 8: toISTDateString with string');
  const stringDate = '2025-03-04';
  const convertedString = toISTDateString(stringDate);
  if (convertedString === stringDate) {
    console.log('✅ PASS: toISTDateString preserves YYYY-MM-DD string');
    passed++;
  } else {
    console.log('❌ FAIL: String conversion failed');
    failed++;
  }
  
  // Test 9: formatDateForDisplay
  console.log('\nTest 9: formatDateForDisplay');
  const formatted = formatDateForDisplay(today);
  if (formatted && formatted.length > 0) {
    console.log('✅ PASS: formatDateForDisplay() =', formatted);
    passed++;
  } else {
    console.log('❌ FAIL: Format failed');
    failed++;
  }
  
  // Test 10: getRelativeDateLabel
  console.log('\nTest 10: getRelativeDateLabel');
  const todayLabel = getRelativeDateLabel(today);
  const tomorrowLabel = getRelativeDateLabel(tomorrow);
  const yesterdayLabel = getRelativeDateLabel(yesterday);
  if (todayLabel === 'Today' && tomorrowLabel === 'Tomorrow' && yesterdayLabel === 'Yesterday') {
    console.log('✅ PASS: getRelativeDateLabel works correctly');
    console.log('  - Today:', todayLabel);
    console.log('  - Tomorrow:', tomorrowLabel);
    console.log('  - Yesterday:', yesterdayLabel);
    passed++;
  } else {
    console.log('❌ FAIL: Relative labels incorrect');
    console.log('  - Today:', todayLabel, '(expected: Today)');
    console.log('  - Tomorrow:', tomorrowLabel, '(expected: Tomorrow)');
    console.log('  - Yesterday:', yesterdayLabel, '(expected: Yesterday)');
    failed++;
  }
  
  // Test 11: compareDates
  console.log('\nTest 11: compareDates');
  const cmp1 = compareDates(yesterday, today);
  const cmp2 = compareDates(today, today);
  const cmp3 = compareDates(tomorrow, today);
  if (cmp1 === -1 && cmp2 === 0 && cmp3 === 1) {
    console.log('✅ PASS: compareDates works correctly');
    console.log('  - yesterday < today:', cmp1);
    console.log('  - today === today:', cmp2);
    console.log('  - tomorrow > today:', cmp3);
    passed++;
  } else {
    console.log('❌ FAIL: compareDates not working');
    failed++;
  }
  
  // Test 12: formatTime12Hour
  console.log('\nTest 12: formatTime12Hour');
  const time1 = formatTime12Hour('09:30');
  const time2 = formatTime12Hour('14:45');
  const time3 = formatTime12Hour('00:00');
  const time4 = formatTime12Hour('12:00');
  if (time1 === '9:30 AM' && time2 === '2:45 PM' && time3 === '12:00 AM' && time4 === '12:00 PM') {
    console.log('✅ PASS: formatTime12Hour works correctly');
    console.log('  - 09:30 →', time1);
    console.log('  - 14:45 →', time2);
    console.log('  - 00:00 →', time3);
    console.log('  - 12:00 →', time4);
    passed++;
  } else {
    console.log('❌ FAIL: Time formatting incorrect');
    console.log('  - 09:30 →', time1, '(expected: 9:30 AM)');
    console.log('  - 14:45 →', time2, '(expected: 2:45 PM)');
    failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary:');
  console.log('  ✅ Passed:', passed);
  console.log('  ❌ Failed:', failed);
  console.log('  📈 Success Rate:', Math.round((passed / (passed + failed)) * 100) + '%');
  console.log('='.repeat(50));
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Date helpers are working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the implementation.');
  }
  
  return { passed, failed };
}

/**
 * Test booking date scenarios
 */
export function testBookingScenarios() {
  console.log('\n🧪 Testing Booking Scenarios...\n');
  
  const today = getTodayIST();
  const tomorrow = getTomorrowIST();
  const yesterday = getYesterdayIST();
  
  // Scenario 1: Booking created for today
  console.log('Scenario 1: Booking for Today');
  const booking1 = { date: today, time: '10:00' };
  console.log('  Booking:', booking1);
  console.log('  Is Today?:', isToday(booking1.date));
  console.log('  Is Past?:', isPast(booking1.date));
  console.log('  Can Assign Worker?:', !isPast(booking1.date));
  console.log('  Display:', getRelativeDateLabel(booking1.date));
  
  // Scenario 2: Booking created for tomorrow
  console.log('\nScenario 2: Booking for Tomorrow');
  const booking2 = { date: tomorrow, time: '14:30' };
  console.log('  Booking:', booking2);
  console.log('  Is Today?:', isToday(booking2.date));
  console.log('  Is Future?:', isFuture(booking2.date));
  console.log('  Can Assign Worker?:', !isPast(booking2.date));
  console.log('  Display:', getRelativeDateLabel(booking2.date));
  
  // Scenario 3: Past booking
  console.log('\nScenario 3: Past Booking');
  const booking3 = { date: yesterday, time: '09:00' };
  console.log('  Booking:', booking3);
  console.log('  Is Today?:', isToday(booking3.date));
  console.log('  Is Past?:', isPast(booking3.date));
  console.log('  Can Assign Worker?:', !isPast(booking3.date));
  console.log('  Display:', getRelativeDateLabel(booking3.date));
  
  // Scenario 4: Filter today's bookings
  console.log('\nScenario 4: Filter Today\'s Bookings');
  const allBookings = [booking1, booking2, booking3];
  const todaysBookings = allBookings.filter(b => isToday(b.date));
  console.log('  All Bookings:', allBookings.length);
  console.log('  Today\'s Bookings:', todaysBookings.length);
  console.log('  ✅ Correct:', todaysBookings.length === 1);
  
  // Scenario 5: Sort bookings by date
  console.log('\nScenario 5: Sort Bookings by Date');
  const unsorted = [booking2, booking1, booking3];
  const sorted = [...unsorted].sort((a, b) => compareDates(a.date, b.date));
  console.log('  Unsorted:', unsorted.map(b => b.date));
  console.log('  Sorted:', sorted.map(b => b.date));
  console.log('  ✅ Correct:', sorted[0].date === yesterday && sorted[2].date === tomorrow);
}

/**
 * Run all tests (call this from browser console)
 */
export function runAllTests() {
  console.clear();
  console.log('🚀 Starting Date Helper Tests\n');
  console.log('Current Time (IST):', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  console.log('Today (IST):', getTodayIST());
  console.log('\n' + '='.repeat(50) + '\n');
  
  const results = runDateHelperTests();
  testBookingScenarios();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Testing Complete!');
  console.log('='.repeat(50));
  
  return results;
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.runDateHelperTests = runDateHelperTests;
  window.testBookingScenarios = testBookingScenarios;
  window.runAllTests = runAllTests;
  
  console.log('💡 Date Helper Tests loaded!');
  console.log('Run tests with: runAllTests()');
}
