import React from 'react';

const CompanyChart = ({ data, darkMode }) => {
  const total = data.active + data.inactive;
  const activePercentage = total > 0 ? (data.active / total) * 100 : 0;
  const inactivePercentage = total > 0 ? (data.inactive / total) * 100 : 0;

  return (
    <div className={`p-6 rounded-xl shadow-sm border ${
      darkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <h3 className={`text-lg font-semibold mb-6 ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        Company Status Distribution
      </h3>
      
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={darkMode ? '#374151' : '#e5e7eb'}
              strokeWidth="3"
            />
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeDasharray={`${activePercentage}, 100`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xl font-bold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {Math.round(activePercentage)}%
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className={`text-sm ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Active Companies
            </span>
          </div>
          <span className={`text-sm font-medium ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {data.active}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              darkMode ? 'bg-gray-600' : 'bg-gray-300'
            }`}></div>
            <span className={`text-sm ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Inactive Companies
            </span>
          </div>
          <span className={`text-sm font-medium ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {data.inactive}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CompanyChart;