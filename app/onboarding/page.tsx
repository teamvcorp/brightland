'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useProperties, usePropertyOwners } from '../hooks';

export default function OnboardingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    userType: 'tenant' as 'tenant' | 'property-owner',
    selectedProperty: '',
    propertyOwnerName: '',
    isNewPropertyOwner: false,
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Use custom hooks for data fetching
  const { properties, loading: propertiesLoading } = useProperties();
  const { propertyOwners, loading: ownersLoading } = usePropertyOwners();
  const loadingData = propertiesLoading || ownersLoading;

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }
    
    // If user already has complete profile, redirect to appropriate dashboard
    const hasCompletedProfile = 
      (session.user.userType === 'tenant' && session.user.selectedProperty) ||
      (session.user.userType === 'property-owner' && session.user.company);
    
    if (hasCompletedProfile) {
      // Already onboarded, redirect to appropriate dashboard
      if (session.user.userType === 'property-owner') {
        router.push('/property-owner-dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  }, [session, status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (formData.userType === 'tenant' && !formData.selectedProperty) {
        throw new Error('Please select a property');
      }
      
      if (formData.userType === 'property-owner' && !formData.propertyOwnerName) {
        throw new Error('Please enter or select a property owner name');
      }

      console.log('Submitting onboarding data:', formData);

      // Update user profile with onboarding data
      const response = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session?.user?.email,
          userType: formData.userType,
          selectedProperty: formData.userType === 'tenant' ? formData.selectedProperty : undefined,
          propertyOwnerName: formData.userType === 'property-owner' ? formData.propertyOwnerName : undefined,
          isNewPropertyOwner: formData.userType === 'property-owner' ? formData.isNewPropertyOwner : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to complete onboarding');
      }

      // Update the session to reflect the changes
      console.log('Onboarding complete, updating session...');
      await update();
      
      // Add a small delay to ensure session is updated
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Session updated, redirecting to dashboard...');
      
      // Redirect based on user type
      if (formData.userType === 'property-owner') {
        router.push('/property-owner-dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full">
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <Image
              alt="Your Company"
              src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
              className="h-10 w-auto"
              width={40}
              height={40}
            />
            <h2 className="mt-8 text-2xl/9 font-bold tracking-tight text-gray-900">
              Complete Your Profile
            </h2>
            <p className="mt-2 text-sm/6 text-gray-500">
              Welcome, {session?.user?.name}! Please complete your profile to continue.
            </p>
          </div>

          <div className="mt-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="userType" className="block text-sm/6 font-medium text-gray-900">
                  I am a...
                </label>
                <div className="mt-2">
                  <select
                    id="userType"
                    name="userType"
                    value={formData.userType}
                    onChange={handleChange}
                    required
                    className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                  >
                    <option value="tenant">Tenant (Renter)</option>
                    <option value="property-owner">Property Owner</option>
                  </select>
                </div>
              </div>

              {/* Conditional field for tenants - property selection */}
              {formData.userType === 'tenant' && (
                <div>
                  <label htmlFor="selectedProperty" className="block text-sm/6 font-medium text-gray-900">
                    Select Your Property
                  </label>
                  <div className="mt-2">
                    <select
                      id="selectedProperty"
                      name="selectedProperty"
                      value={formData.selectedProperty}
                      onChange={handleChange}
                      required
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    >
                      <option value="">{loadingData ? 'Loading properties...' : 'Select a property...'}</option>
                      {properties.map((property: { name: string; description: string }, index: number) => (
                        <option key={index} value={property.name}>
                          {property.name} - {property.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Conditional fields for property owners */}
              {formData.userType === 'property-owner' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm/6 font-medium text-gray-900 mb-2">
                      Property Owner Registration
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="isNewPropertyOwner"
                          value="false"
                          checked={!formData.isNewPropertyOwner}
                          onChange={(e) => setFormData({ ...formData, isNewPropertyOwner: false, propertyOwnerName: '' })}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Select existing property owner</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="isNewPropertyOwner"
                          value="true"
                          checked={formData.isNewPropertyOwner}
                          onChange={(e) => setFormData({ ...formData, isNewPropertyOwner: true, propertyOwnerName: '' })}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Register as new property owner</span>
                      </label>
                    </div>
                  </div>

                  {!formData.isNewPropertyOwner ? (
                    <div>
                      <label htmlFor="propertyOwnerName" className="block text-sm/6 font-medium text-gray-900">
                        Select Property Owner
                      </label>
                      <div className="mt-2">
                        <select
                          id="propertyOwnerName"
                          name="propertyOwnerName"
                          value={formData.propertyOwnerName}
                          onChange={handleChange}
                          required
                          className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                        >
                          <option value="">{loadingData ? 'Loading property owners...' : 'Select an existing property owner...'}</option>
                          {propertyOwners.map((owner: { name: string }, index: number) => (
                            <option key={index} value={owner.name}>
                              {owner.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="propertyOwnerName" className="block text-sm/6 font-medium text-gray-900">
                        New Property Owner Name
                      </label>
                      <div className="mt-2">
                        <input
                          id="propertyOwnerName"
                          name="propertyOwnerName"
                          type="text"
                          value={formData.propertyOwnerName}
                          onChange={handleChange}
                          required
                          placeholder="Enter property owner business name"
                          className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                        />
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        This will create a new property owner record in the system.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3 rounded-md text-sm/6 bg-red-50 text-red-700 border border-red-200">
                  {error}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-300 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Completing profile...
                    </div>
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="relative hidden w-0 flex-1 lg:block">
        <Image
          alt=""
          src="https://images.unsplash.com/photo-1496917756835-20cb06e75b4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1908&q=80"
          className="absolute inset-0 size-full object-cover"
          fill
          priority
        />
      </div>
    </div>
  );
}
