import React from 'react';

const TopCompaniesTable = ({ companies, services, bookings, darkMode }) => {
  const getCompanyStats = (companyId) => {
    const companyServices = services.filter(s => s.companyId === companyId);
    const companyBookings = bookings.filter(b => b.companyId === companyId);
    const revenue = companyBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
    
    return {
      servicesCount: companyServices.length,
      bookingsCount: companyBookings.length,
      revenue: revenue
    };
  };

  const topCompanies = companies
    .map(company => ({
      ...company,
      stats: getCompanyStats(company.id)
    }))
    .sort((a, b) => b.stats.revenue - a.stats.revenue)
    .slice(0, 5);

  return (
    <div className={`p-6 rounded-xl shadow-sm border ${
      darkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <h3 className={`text-lg font-semibold mb-6 ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        Top Performing Companies
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <th className={`text-left py-3 px-2 text-xs font-medium uppercase tracking-wider ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Company
              </th>
              <th className={`text-left py-3 px-2 text-xs font-medium uppercase tracking-wider ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Services
              </th>
              <th className={`text-left py-3 px-2 text-xs font-medium uppercase tracking-wider ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Bookings
              </th>
              <th className={`text-left py-3 px-2 text-xs font-medium uppercase tracking-wider ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Revenue
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {topCompanies.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-8">
                  <span className="text-4xl mb-2 block">🏢</span>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    No companies found
                  </p>
                </td>
              </tr>
            ) : (
              topCompanies.map((company, index) => (
                <tr key={company.id} className={`${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                } transition-colors`}>
                  <td className="py-4 px-2">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                      }`}>
                        {(company.companyName || company.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <p className={`text-sm font-medium ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {company.companyName || company.name || 'Unknown'}
                        </p>
                        <p className={`text-xs ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {company.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={`py-4 px-2 text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-900'
                  }`}>
                    {company.stats.servicesCount}
                  </td>
                  <td className={`py-4 px-2 text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-900'
                  }`}>
                    {company.stats.bookingsCount}
                  </td>
                  <td className={`py-4 px-2 text-sm font-medium ${
                    darkMode ? 'text-green-400' : 'text-green-600'
                  }`}>
                    ₹{company.stats.revenue.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopCompaniesTable;