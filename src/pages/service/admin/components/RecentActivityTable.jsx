import React from 'react';

const RecentActivityTable = ({ activities, darkMode }) => {
  const getStatusColor = (success) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  const getStatusBg = (success) => {
    return success 
      ? (darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800')
      : (darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800');
  };

  return (
    <div className={`p-6 rounded-xl shadow-sm border ${
      darkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <h3 className={`text-lg font-semibold mb-6 ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        Recent Login Activity
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
                Action
              </th>
              <th className={`text-left py-3 px-2 text-xs font-medium uppercase tracking-wider ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Time
              </th>
              <th className={`text-left py-3 px-2 text-xs font-medium uppercase tracking-wider ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {activities.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-8">
                  <span className="text-4xl mb-2 block">📊</span>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    No recent activity
                  </p>
                </td>
              </tr>
            ) : (
              activities.map((activity, index) => (
                <tr key={index} className={`${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                } transition-colors`}>
                  <td className="py-4 px-2">
                    <p className={`text-sm font-medium ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {activity.companyName || 'Unknown Company'}
                    </p>
                    <p className={`text-xs ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {activity.ipAddress || 'N/A'}
                    </p>
                  </td>
                  <td className={`py-4 px-2 text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-900'
                  }`}>
                    {activity.action || activity.type || 'Login'}
                  </td>
                  <td className={`py-4 px-2 text-sm ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    {activity.timestamp 
                      ? new Date(activity.timestamp).toLocaleString()
                      : 'Just now'
                    }
                  </td>
                  <td className="py-4 px-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      getStatusBg(activity.success !== false)
                    }`}>
                      {activity.success !== false ? 'Success' : 'Failed'}
                    </span>
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

export default RecentActivityTable;