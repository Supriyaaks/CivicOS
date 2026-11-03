import React from 'react';

const CitizenPortal: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Citizen Portal</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <p className="text-lg text-gray-700 mb-4">Welcome to the Citizen Portal!</p>
        <p className="text-gray-600 leading-relaxed">
          This portal is intended for citizens to report civic issues, track their complaints, 
          and stay updated on city-wide improvements.
        </p>
      </div>
    </div>
  );
};

export default CitizenPortal;
