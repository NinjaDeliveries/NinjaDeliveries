# App Integration Guide - Worker Availability System

## समस्या का समाधान
अब app को real-time पता चल जाएगा कि कौन सी company के पास available workers हैं या नहीं। अगर सभी workers busy हैं तो वह company app में show ही नहीं होगी।

## App में Integration Steps

### 1. Service Listing में Availability Check

```javascript
// जब user service list देखता है
const getAvailableServices = async (location, date, time) => {
  try {
    const response = await fetch('/api/get-available-companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId: selectedServiceId,
        date: date,
        time: time
      })
    });

    const result = await response.json();
    
    if (result.success && result.data.availableCompanies > 0) {
      // Show available companies
      return result.data.companies;
    } else {
      // No companies available
      showNoAvailabilityMessage();
      return [];
    }
  } catch (error) {
    console.error('Availability check failed:', error);
    return [];
  }
};
```

### 2. Real-time Availability Check

```javascript
// जब user date/time select करता है
const checkRealTimeAvailability = async (serviceId, date, time) => {
  try {
    const response = await fetch('/api/realtime-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId,
        date,
        time,
        location: userLocation
      })
    });

    const result = await response.json();
    
    if (result.success && result.available) {
      // Show available providers
      displayAvailableProviders(result.data.companies);
      enableBookingButton();
    } else {
      // No availability
      showNoAvailabilityMessage(result.data.suggestions);
      disableBookingButton();
    }
  } catch (error) {
    console.error('Real-time check failed:', error);
  }
};
```

### 3. Company Visibility Logic

```javascript
// Company visibility in app
const shouldShowCompany = (company) => {
  // Company will only be visible if:
  // 1. Company is active
  // 2. Service is active  
  // 3. At least one worker is available for selected time
  // 4. availableForBooking flag is true
  
  return company.isActive && 
         company.serviceActive && 
         company.availableForBooking &&
         company.availableWorkers > 0;
};
```

## Database Collections

### 1. `service_availability` Collection
```javascript
{
  companyId: "company123",
  serviceId: "service456", 
  date: "2026-02-04",
  time: "10:00 AM - 12:00 PM",
  available: true,
  availableWorkers: 2,
  totalWorkers: 3,
  utilizationRate: "33.3",
  lastUpdated: timestamp,
  reason: "WORKERS_AVAILABLE"
}
```

### 2. Updated `service_services` Collection
```javascript
{
  // ... existing fields
  availableForBooking: true,  // NEW FIELD
  lastAvailabilityCheck: timestamp,
  availabilityReason: "WORKERS_AVAILABLE"
}
```

### 3. Updated `app_services` Collection  
```javascript
{
  // ... existing fields
  availableProviders: 5,  // NEW FIELD
  lastAvailabilityUpdate: timestamp
}
```

## App UI Changes Required

### 1. Service Card में Availability Indicator
```javascript
const ServiceCard = ({ service }) => {
  return (
    <div className="service-card">
      <h3>{service.name}</h3>
      
      {/* Availability Indicator */}
      <div className="availability-status">
        {service.availableProviders > 0 ? (
          <span className="available">
            ✅ {service.availableProviders} providers available
          </span>
        ) : (
          <span className="unavailable">
            ❌ No providers available
          </span>
        )}
      </div>
      
      <button 
        disabled={service.availableProviders === 0}
        onClick={() => bookService(service)}
      >
        Book Now
      </button>
    </div>
  );
};
```

### 2. Time Slot Selection में Real-time Check
```javascript
const TimeSlotPicker = ({ onTimeSelect }) => {
  const handleTimeSelect = async (time) => {
    setLoading(true);
    
    // Real-time availability check
    const availability = await checkRealTimeAvailability(
      selectedService.id,
      selectedDate, 
      time
    );
    
    if (availability.available) {
      onTimeSelect(time);
      showAvailableProviders(availability.companies);
    } else {
      showUnavailableMessage(availability.suggestions);
    }
    
    setLoading(false);
  };

  return (
    <div className="time-slots">
      {timeSlots.map(slot => (
        <button 
          key={slot}
          onClick={() => handleTimeSelect(slot)}
          className="time-slot"
        >
          {slot}
        </button>
      ))}
    </div>
  );
};
```

## Benefits

### 1. User Experience
- ❌ कोई false bookings नहीं होंगी
- ✅ User को पहले से पता चल जाएगा availability
- ⚡ Real-time updates मिलेंगे
- 🎯 Accurate service provider list

### 2. Business Benefits  
- 📈 Better resource utilization
- 🚫 Reduced booking conflicts
- ⭐ Improved customer satisfaction
- 📊 Better analytics and reporting

### 3. Technical Benefits
- 🔄 Automatic availability updates
- ⚡ Real-time synchronization
- 🛡️ Conflict prevention
- 📱 Seamless app integration

## Testing

### 1. Test Scenarios
```javascript
// Test 1: All workers busy
// Expected: Company should not appear in app

// Test 2: Some workers available  
// Expected: Company appears with availability count

// Test 3: Worker gets assigned
// Expected: Availability updates automatically

// Test 4: Booking completed
// Expected: Worker becomes available again
```

### 2. Manual Testing Commands
```javascript
// Force refresh availability
POST /api/refresh-availability
{
  "companyId": "company123",
  "serviceId": "service456"
}

// Check specific time slot
POST /api/check-availability  
{
  "companyId": "company123",
  "serviceId": "service456",
  "date": "2026-02-04",
  "time": "10:00 AM - 12:00 PM"
}
```

## Implementation Priority

1. ✅ **Phase 1**: Basic availability checking (DONE)
2. 🔄 **Phase 2**: Cloud Functions integration (IN PROGRESS)  
3. 📱 **Phase 3**: App API integration (NEXT)
4. 🎨 **Phase 4**: UI updates in app (FINAL)

यह system implement होने के बाद app में कोई भी company तभी show होगी जब उसके पास available workers होंगे। User को कभी भी false booking का experience नहीं मिलेगा।