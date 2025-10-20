'use client';

import { useState, useEffect } from 'react';

interface PropertyOwner {
  name: string;
}

interface UsePropertyOwnersReturn {
  propertyOwners: PropertyOwner[];
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to fetch and manage property owners data
 * Includes 8-second timeout for slow API responses
 * Replaces duplicated loadPropertyOwners logic in signup and onboarding pages
 */
export function usePropertyOwners(): UsePropertyOwnersReturn {
  const [propertyOwners, setPropertyOwners] = useState<PropertyOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPropertyOwners = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch('/api/property-owners', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setPropertyOwners(data);
          } else {
            console.error('Property owners data is not an array:', data);
            setPropertyOwners([]);
          }
        } else {
          setError('Failed to load property owners');
          setPropertyOwners([]);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('Property owners request timed out');
          setError('Request timed out');
        } else {
          console.error('Error loading property owners:', error);
          setError('Error loading property owners');
        }
        setPropertyOwners([]);
      } finally {
        setLoading(false);
      }
    };

    loadPropertyOwners();
  }, []);

  return { propertyOwners, loading, error };
}
