import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Calendar, Clock, Pill, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Medicine, MedicineLog } from '../types';

interface MedicineManagerProps {
  medicines: Medicine[];
  onAddMedicine: (medicine: Medicine) => void;
  onUpdateMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (medicineId: string) => void;
}

export const MedicineManager: React.FC<MedicineManagerProps> = ({
  medicines,
  onAddMedicine,
  onUpdateMedicine,
  onDeleteMedicine,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Medicine>>({
    name: '',
    dosage: '',
    frequency: 1,
    times: ['08:00'],
    timeLabels: ['Morning'],
    startDate: new Date(),
    isOngoing: true,
    instructions: '',
    doctorName: '',
    notes: '',
  });

  const timeOptions = [
    { value: '08:00', label: 'Breakfast (8:00 AM)' },
    { value: '12:00', label: 'Lunch (12:00 PM)' },
    { value: '20:00', label: 'Dinner (8:00 PM)' },
    { value: '14:00', label: 'Afternoon (2:00 PM)' },
  ];

  const handleAddTime = () => {
    if (formData.times && formData.times.length < 4) {
      setFormData({
        ...formData,
        times: [...formData.times, '08:00'],
        timeLabels: [...(formData.timeLabels || []), 'Morning'],
      });
    }
  };

  const handleRemoveTime = (index: number) => {
    const newTimes = formData.times?.filter((_, i) => i !== index) || [];
    const newLabels = formData.timeLabels?.filter((_, i) => i !== index) || [];
    setFormData({
      ...formData,
      times: newTimes,
      timeLabels: newLabels,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      alert('Please enter medicine name');
      return;
    }

    const medicine: Medicine = {
      id: editingId || Date.now().toString(),
      name: formData.name,
      dosage: formData.dosage || '1 tablet',
      frequency: formData.frequency || 1,
      times: formData.times || ['08:00'],
      timeLabels: formData.timeLabels,
      startDate: formData.startDate || new Date(),
      endDate: formData.isOngoing ? undefined : formData.endDate,
      durationDays: formData.durationDays,
      isOngoing: formData.isOngoing || true,
      instructions: formData.instructions || '',
      doctorName: formData.doctorName,
      notes: formData.notes,
      createdAt: editingId ? new Date(formData.createdAt!) : new Date(),
      updatedAt: new Date(),
    };

    if (editingId) {
      onUpdateMedicine(medicine);
    } else {
      onAddMedicine(medicine);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      dosage: '',
      frequency: 1,
      times: ['08:00'],
      timeLabels: ['Morning'],
      startDate: new Date(),
      isOngoing: true,
      instructions: '',
      doctorName: '',
      notes: '',
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (medicine: Medicine) => {
    setFormData(medicine);
    setEditingId(medicine.id);
    setShowForm(true);
  };

  const daysRemaining = (medicine: Medicine) => {
    if (medicine.isOngoing) return 'Ongoing';
    if (!medicine.endDate) return 'N/A';
    
    const today = new Date();
    const end = new Date(medicine.endDate);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff <= 0) return 'Expired';
    if (diff === 1) return '1 day left';
    return `${diff} days left`;
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Medicines</h2>
          <p className="text-sm text-gray-600 mt-1">Manage daily medications</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2"
        >
          <Plus size={20} />
          <span className="font-semibold">Add</span>
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">{editingId ? 'Edit Medicine' : 'Add New Medicine'}</h3>
            <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Medicine Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Medicine Name *</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Aspirin, Metformin"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Dosage */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Dosage *</label>
              <input
                type="text"
                value={formData.dosage || ''}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                placeholder="e.g., 2 tablets, 5ml syrup"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Frequency & Times */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Times per Day *</label>
              <div className="space-y-2">
                {formData.times?.map((time, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => {
                        const newTimes = [...(formData.times || [])];
                        newTimes[idx] = e.target.value;
                        setFormData({ ...formData, times: newTimes });
                      }}
                      className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                    {formData.times!.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTime(idx)}
                        className="p-2.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {formData.times && formData.times.length < 4 && (
                <button
                  type="button"
                  onClick={handleAddTime}
                  className="mt-2 text-sm text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus size={16} />
                  Add another time
                </button>
              )}
            </div>

            {/* Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label>
                <input
                  type="date"
                  value={formData.startDate ? formData.startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value) })}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <input
                    type="checkbox"
                    checked={formData.isOngoing || false}
                    onChange={(e) => setFormData({ ...formData, isOngoing: e.target.checked })}
                    className="mr-2"
                  />
                  Ongoing Medicine
                </label>
              </div>
            </div>

            {!formData.isOngoing && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={formData.endDate ? formData.endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, endDate: new Date(e.target.value) })}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}

            {/* Instructions */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Instructions</label>
              <textarea
                value={formData.instructions || ''}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="e.g., Take after food, with water"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
                rows={2}
              />
            </div>

            {/* Doctor Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Doctor/Prescribed By</label>
              <input
                type="text"
                value={formData.doctorName || ''}
                onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                placeholder="Doctor's name (optional)"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional information..."
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
                rows={2}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-md"
              >
                {editingId ? 'Update' : 'Add'} Medicine
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Medicines List */}
      {medicines.length === 0 ? (
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 text-center border border-blue-100">
          <Pill size={48} className="mx-auto mb-4 text-blue-400" />
          <p className="text-gray-600 font-semibold">No medicines added yet</p>
          <p className="text-sm text-gray-500 mt-1">Add medicines to track daily intake</p>
        </div>
      ) : (
        <div className="space-y-3">
          {medicines.map((medicine) => (
            <div
              key={medicine.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="p-3 bg-purple-100 rounded-xl flex-shrink-0">
                  <Pill size={24} className="text-purple-600" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{medicine.name}</h3>
                      <p className="text-sm text-gray-600">{medicine.dosage}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(medicine)}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${medicine.name}?`)) {
                            onDeleteMedicine(medicine.id);
                          }
                        }}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Times */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Clock size={16} className="text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700 font-semibold">
                      {medicine.times.join(', ')}
                    </span>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={16} className="text-gray-500 flex-shrink-0" />
                    <span>{daysRemaining(medicine)}</span>
                  </div>

                  {/* Instructions */}
                  {medicine.instructions && (
                    <p className="text-sm text-gray-600 mt-2 italic">
                      {medicine.instructions}
                    </p>
                  )}

                  {/* Doctor Name */}
                  {medicine.doctorName && (
                    <p className="text-xs text-gray-500 mt-1">
                      👨‍⚕️ Prescribed by: {medicine.doctorName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
