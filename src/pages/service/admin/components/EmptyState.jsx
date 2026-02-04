import React from 'react';

const EmptyState = ({ 
  icon = "📊", 
  title = "No Data Available", 
  description = "There's no data to display at the moment.",
  darkMode = false 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-6xl mb-4 opacity-50">
        {icon}
      </div>
      <h3 className={`text-lg font-semibold mb-2 ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        {title}
      </h3>
      <p className={`text-sm text-center max-w-md ${
        darkMode ? 'text-gray-400' : 'text-gray-600'
      }`}>
        {description}
      </p>
    </div>
  );
};

export default EmptyState;