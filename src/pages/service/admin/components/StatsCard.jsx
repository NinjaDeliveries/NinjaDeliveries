import React from 'react';

const StatsCard = ({ title, value, subtitle, icon, trend, darkMode }) => {
  return (
    <div className={`p-6 rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md ${
      darkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {title}
          </p>
          <p className={`text-3xl font-bold mt-2 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {value}
          </p>
          {subtitle && (
            <p className={`text-sm mt-1 ${
              darkMode ? 'text-gray-500' : 'text-gray-500'
            }`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${
          darkMode ? 'bg-gray-700' : 'bg-blue-50'
        }`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
      
      {trend && (
        <div className="mt-4 flex items-center">
          <span className={`text-sm font-medium ${
            trend.type === 'increase' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend.type === 'increase' ? '↗' : '↘'} {trend.value}%
          </span>
          <span className={`text-sm ml-2 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            vs last month
          </span>
        </div>
      )}
    </div>
  );
};

export default StatsCard;