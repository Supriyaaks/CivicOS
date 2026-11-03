import React from 'react';

const OfficerPortal: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Municipal Command Center</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <p className="text-lg text-gray-700 mb-4">Welcome to the Municipal Command Center!</p>
        <p className="text-gray-600 leading-relaxed">
          This portal is intended for municipal officers to oversee city operations,
          analyze predictive intelligence, and coordinate department responses.
        </p>
      </div>
    </div>
  );
};

export default OfficerPortal;
