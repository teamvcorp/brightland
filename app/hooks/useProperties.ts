'use client';

import { useState, useEffect } from 'react';

interface Property {
  name: string;
  description: string;
}

interface UsePropertiesReturn {
  properties: Property[];
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to fetch and manage properties data
 * Replaces duplicated loadProperties logic in signup and onboarding pages
 */
export function useProperties(): UsePropertiesReturn {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        const response = await fetch('/api/properties');
        if (response.ok) {
          const dbProperties = await response.json();
          if (Array.isArray(dbProperties)) {
            setProperties(dbProperties.map((p: any) => ({ 
              name: p.name, 
              description: p.description 
            })));
          } else {
            console.error('Properties data is not an array:', dbProperties);
            setProperties([]);
          }
        } else {
          setError('Failed to load properties');
          setProperties([]);
        }
      } catch (error) {
        console.error('Error loading properties:', error);
        setError('Error loading properties');
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, []);

  return { properties, loading, error };
}
