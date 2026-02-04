import React from 'react';

const ActivityTimeline = ({ activities, darkMode }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'login': return '🔐';
      case 'logout': return '🚪';
      case 'service_added': return '⚙️';
      case 'booking': return '📅';
      default: return '📊';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'login': return 'text-green-600';
      case 'logout': return 'text-red-600';
      case 'service_added': return 'text-blue-600';
      case 'booking': return 'text-purple-600';
      default: return 'text-gray-600';
    }
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
        Recent Activity
      </h3>
      
      <div className="space-y-4 max-h-80 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl mb-2 block">📊</span>
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              No recent activity
            </p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  <span className="font-medium">{activity.companyName || 'Unknown Company'}</span>
                  <span className={`ml-1 ${getActivityColor(activity.type)}`}>
                    {activity.action || activity.type}
                  </span>
                </p>
                <p className={`text-xs mt-1 ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Just now'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityTimeline;