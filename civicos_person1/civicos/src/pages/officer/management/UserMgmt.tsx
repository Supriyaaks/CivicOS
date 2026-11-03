import React, { useState } from 'react';
import { useMccStore, MccUser } from '../../../store/mccStore';

const UserMgmt: React.FC = () => {
  const { users, updateUser } = useMccStore();
  const [filter, setFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editingUser, setEditingUser] = useState<MccUser | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(filter.toLowerCase()) ||
                          u.dept.toLowerCase().includes(filter.toLowerCase()) ||
                          u.contact.toLowerCase().includes(filter.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateUser(editingUser.id, editingUser);
      setEditingUser(null);
    } else {
      // Demo only: Just simulate adding a user
      alert('DEMO: In a real system, this would create a new user in the database.');
      setIsAddingUser(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 text-sm">Control access and roles for Municipal Officers and Staff.</p>
        </div>
        <button
          onClick={() => setIsAddingUser(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all text-sm flex items-center space-x-2"
        >
          <span>+</span> <span>Add User</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        <input
          type="text"
          placeholder="Search users by name, dept or contact..."
          className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="Municipal Officer">Municipal Officer</option>
          <option value="Department Staff">Department Staff</option>
          <option value="Citizen">Citizen</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-slate-500">
              <th className="px-6 py-3 text-xs font-semibold uppercase">User</th>
              <th className="px-6 py-3 text-xs font-semibold uppercase">Role</th>
              <th className="px-6 py-3 text-xs font-semibold uppercase">Department</th>
              <th className="px-6 py-3 text-xs font-semibold uppercase">Status</th>
              <th className="px-6 py-3 text-xs font-semibold uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">{user.name}</span>
                      <span className="text-[10px] text-slate-400">{user.contact}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{user.role}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{user.dept}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right flex justify-end space-x-3">
                  <button
                    onClick={() => setEditingUser({...user})}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => updateUser(user.id, { status: user.status === 'Active' ? 'Inactive' : 'Active' })}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                  No users found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(editingUser || isAddingUser) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <button onClick={() => { setEditingUser(null); setIsAddingUser(false); }} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingUser?.name || ''}
                  onChange={e => editingUser ? setEditingUser({...editingUser, name: e.target.value}) : null}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Contact (Email/Phone)</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingUser?.contact || ''}
                  onChange={e => editingUser ? setEditingUser({...editingUser, contact: e.target.value}) : null}
                  placeholder="email@city.gov"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                  <select
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingUser?.role || 'Municipal Officer'}
                    onChange={e => editingUser ? setEditingUser({...editingUser, role: e.target.value as any}) : null}
                  >
                    <option value="Municipal Officer">Municipal Officer</option>
                    <option value="Department Staff">Department Staff</option>
                    <option value="Citizen">Citizen</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                  <select
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingUser?.status || 'Active'}
                    onChange={e => editingUser ? setEditingUser({...editingUser, status: e.target.value as any}) : null}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Department</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingUser?.dept || ''}
                  onChange={e => editingUser ? setEditingUser({...editingUser, dept: e.target.value}) : null}
                  placeholder="e.g. Water & Sewage"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => { setEditingUser(null); setIsAddingUser(false); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMgmt;
