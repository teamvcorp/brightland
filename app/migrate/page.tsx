'use client';

import { useState } from 'react';

export default function MigrationPage() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const runMigration = async () => {
    setLoading(true);
    setStatus('Running migration...');
    
    try {
      const response = await fetch('/api/admin/migrate-data', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStatus(`✅ Success: ${data.propertiesCreated} properties migrated to database`);
      } else {
        setStatus(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      setStatus('❌ Error: Failed to migrate data');
    } finally {
      setLoading(false);
    }
  };

  const checkProperties = async () => {
    try {
      const response = await fetch('/api/properties');
      const data = await response.json();
      setStatus(`Database has ${data.length} properties`);
    } catch (error) {
      setStatus('❌ Error: Failed to check properties');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Database Migration</h1>
        
        <div className="space-y-4">
          <button
            onClick={runMigration}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Migrating...' : 'Run Migration'}
          </button>
          
          <button
            onClick={checkProperties}
            className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
          >
            Check Database
          </button>
          
          {status && (
            <div className="p-4 bg-gray-100 rounded">
              <p className="text-sm">{status}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}