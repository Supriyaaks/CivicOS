import React, { useState } from 'react';
import { useCitizenStore } from '../../store/citizenStore';

const PersonalProfile: React.FC = () => {
  const { profile, updateProfile } = useCitizenStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editProfile, setEditProfile] = useState(profile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditProfile(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!editProfile.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!editProfile.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editProfile.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!editProfile.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!editProfile.address.trim()) newErrors.address = 'Address is required';
    if (!editProfile.city.trim()) newErrors.city = 'City is required';
    if (!editProfile.pinCode.trim()) newErrors.pinCode = 'PIN code is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      updateProfile(editProfile);
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleCancel = () => {
    setEditProfile(profile);
    setIsEditing(false);
    setErrors({});
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* A. Profile Overview */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-center gap-8">
        <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-white shadow-sm">
          {profile.fullName.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="text-center md:text-left flex-1 space-y-1">
          <h1 className="text-3xl font-bold text-gray-900">{profile.fullName}</h1>
          <p className="text-gray-500">{profile.email} • {profile.phone}</p>
          <div className="pt-4">
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all shadow-sm"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 text-center font-medium animate-pulse">
          Profile updated successfully! (Demo only)
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* B. Personal Information */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-xl">👤</span>
            <h2 className="text-lg font-bold text-gray-800">Personal Information</h2>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Full Name', name: 'fullName', type: 'text' },
              { label: 'Email Address', name: 'email', type: 'email' },
              { label: 'Phone Number', name: 'phone', type: 'tel' },
              { label: 'Date of Birth', name: 'dob', type: 'date' },
              { label: 'Gender', name: 'gender', type: 'select', options: ['Male', 'Female', 'Other', 'Prefer not to say'] },
            ].map((field) => (
              <div key={field.name} className="space-y-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase">{field.label}</label>
                {field.type === 'select' ? (
                  <select
                    disabled={!isEditing}
                    name={field.name}
                    value={editProfile[field.name as keyof typeof editProfile]}
                    onChange={handleInputChange}
                    className={`w-full p-2 border rounded-lg outline-none transition-all ${isEditing ? 'border-gray-300 focus:ring-2 focus:ring-blue-500' : 'border-transparent bg-gray-50 cursor-default'}`}
                  >
                    {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input
                    disabled={!isEditing}
                    type={field.type}
                    name={field.name}
                    value={editProfile[field.name as keyof typeof editProfile]}
                    onChange={handleInputChange}
                    className={`w-full p-2 border rounded-lg outline-none transition-all ${isEditing ? 'border-gray-300 focus:ring-2 focus:ring-blue-500' : 'border-transparent bg-gray-50 cursor-default'}`}
                  />
                )}
                {isEditing && errors[field.name] && (
                  <p className="text-xs text-red-500 mt-1">{errors[field.name]}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* C. Address Information */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-xl">🏠</span>
            <h2 className="text-lg font-bold text-gray-800">Address Information</h2>
          </div>

          <div className="space-y-4">
            {[
              { label: 'House / Street Address', name: 'address', type: 'text' },
              { label: 'City', name: 'city', type: 'text' },
              { label: 'State', name: 'state', type: 'text' },
              { label: 'PIN Code', name: 'pinCode', type: 'text' },
            ].map((field) => (
              <div key={field.name} className="space-y-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase">{field.label}</label>
                <input
                  disabled={!isEditing}
                  type={field.type}
                  name={field.name}
                  value={editProfile[field.name as keyof typeof editProfile]}
                  onChange={handleInputChange}
                  className={`w-full p-2 border rounded-lg outline-none transition-all ${isEditing ? 'border-gray-300 focus:ring-2 focus:ring-blue-500' : 'border-transparent bg-gray-50 cursor-default'}`}
                />
                {isEditing && errors[field.name] && (
                  <p className="text-xs text-red-500 mt-1">{errors[field.name]}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* D. Edit Profile Actions */}
      {isEditing && (
        <div className="flex justify-end space-x-4 pt-4">
          <button
            onClick={handleCancel}
            className="px-6 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm transition-colors"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
};

export default PersonalProfile;
