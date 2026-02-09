// Firestore Data Structure Design
// =================================

/*
// 1. Companies Collection
companies: {
  [companyId]: {
    id: string,
    companyName: string,
    ownerName: string,
    email: string,
    phone: string,
    city: string,
    state: string,
    address: string,
    category: string,
    status: 'active' | 'inactive' | 'pending' | 'suspended',
    registrationDate: timestamp,
    lastLogin: timestamp,
    isOnline: boolean,
    subscription: {
      plan: 'basic' | 'premium' | 'enterprise',
      startDate: timestamp,
      endDate: timestamp,
      status: 'active' | 'expired' | 'cancelled'
    },
    billing: {
      totalRevenue: number,
      monthlyRevenue: number,
      pendingPayments: number,
      lastPaymentDate: timestamp
    },
    metrics: {
      totalBookings: number,
      monthlyBookings: number,
      totalServices: number,
      activeServices: number,
      averageRating: number,
      completionRate: number
    },
    deviceInfo: {
      lastLoginDevice: string,
      lastLoginOS: string,
      lastLoginBrowser: string,
      lastLoginIP: string
    },
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

// 2. Services Collection
services: {
  [serviceId]: {
    id: string,
    companyId: string,
    serviceName: string,
    description: string,
    category: string,
    price: number,
    duration: number,
    status: 'active' | 'inactive' | 'draft',
    bookingsCount: number,
    revenue: number,
    averageRating: number,
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

// 3. Categories Collection
categories: {
  [categoryId]: {
    id: string,
    name: string,
    description: string,
    icon: string,
    status: 'active' | 'inactive',
    serviceCount: number,
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

// 4. Bookings Collection
bookings: {
  [bookingId]: {
    id: string,
    companyId: string,
    serviceId: string,
    customerName: string,
    customerEmail: string,
    customerPhone: string,
    bookingDate: timestamp,
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled',
    amount: number,
    paymentStatus: 'pending' | 'paid' | 'refunded',
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

// 5. Activity Logs Collection
activityLogs: {
  [logId]: {
    id: string,
    companyId: string,
    userId: string,
    action: string,
    details: {
      field?: string,
      oldValue?: any,
      newValue?: any,
      description?: string
    },
    deviceInfo: {
      userAgent: string,
      device: string,
      os: string,
      browser: string,
      ip: string
    },
    timestamp: timestamp,
    type: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'booking' | 'payment'
  }
}

// 6. Online Status (Realtime Database)
onlineStatus: {
  [companyId]: {
    isOnline: boolean,
    lastSeen: timestamp,
    deviceInfo: {
      device: string,
      os: string,
      browser: string,
      ip: string
    }
  }
}

// 7. Analytics Collection (Aggregated data)
analytics: {
  daily: {
    [date]: {
      date: string,
      totalCompanies: number,
      activeCompanies: number,
      newRegistrations: number,
      totalBookings: number,
      totalRevenue: number,
      topCompanies: Array<{
        companyId: string,
        companyName: string,
        bookings: number,
        revenue: number
      }>
    }
  },
  monthly: {
    [month]: {
      month: string,
      totalCompanies: number,
      activeCompanies: number,
      newRegistrations: number,
      totalBookings: number,
      totalRevenue: number,
      topCategories: Array<{
        category: string,
        count: number,
        revenue: number
      }>
    }
  }
}
*/
