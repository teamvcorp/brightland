'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Image from 'next/image';

const SignUpContent = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    userType: 'tenant' as 'tenant' | 'property-owner',
    selectedProperty: '',
    propertyOwnerName: '',
    isNewPropertyOwner: false,
  });
  const [properties, setProperties] = useState<Array<{name: string, description: string}>>([]);
  const [propertyOwners, setPropertyOwners] = useState<Array<{name: string}>>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get callback URL from search params
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  // Load all available properties and property owners on component mount
  useEffect(() => {
    // Load properties from database
    const loadProperties = async () => {
      try {
        const response = await fetch('/api/properties');
        if (response.ok) {
          const dbProperties = await response.json();
          // Ensure dbProperties is an array before mapping
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
          console.error('Failed to load properties from database');
          setProperties([]);
        }
      } catch (error) {
        console.error('Error loading properties:', error);
        setProperties([]);
      }
    };

    // Load property owners
    const loadPropertyOwners = async () => {
      try {
        console.log('Starting to load property owners...');
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        const response = await fetch('/api/property-owners', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log('Property owners response status:', response.status, response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Property owners response data:', data);
          console.log('Is response data an array?', Array.isArray(data));
          console.log('Response data length:', data?.length);
          
          // Ensure data is an array before setting it
          if (Array.isArray(data)) {
            setPropertyOwners(data);
            console.log('Successfully set property owners:', data.length, 'owners');
          } else {
            console.error('Property owners data is not an array:', data);
            console.error('Data type:', typeof data);
            setPropertyOwners([]);
          }
        } else {
          console.error('Failed to load property owners - response not ok');
          console.error('Response status:', response.status);
          console.error('Response text:', await response.text());
          setPropertyOwners([]);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('Property owners request timed out after 8 seconds');
        } else {
          console.error('Error loading property owners:', error);
          console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
        }
        setPropertyOwners([]);
      }
    };

    loadProperties();
    loadPropertyOwners();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create user');
      }

      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // Route based on user type and callback URL
      if (formData.userType === 'property-owner') {
        router.push('/property-owner-dashboard');
      } else if (callbackUrl && callbackUrl !== '/dashboard') {
        // If there's a specific callback URL (like rental application), use it
        router.push(callbackUrl);
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      await signIn('google', { callbackUrl: callbackUrl });
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed');
    }
  };

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
            <h2 className="mt-8 text-2xl/9 font-bold tracking-tight text-gray-900">Create your account</h2>
            <p className="mt-2 text-sm/6 text-gray-500">
              Already have an account?{' '}
              <a href="/auth/signin" className="font-semibold text-indigo-600 hover:text-indigo-500">
                Sign in
              </a>
            </p>
          </div>

          <div className="mt-10">
            <div>
              <form onSubmit={handleSignUp} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm/6 font-medium text-gray-900">
                    Full Name
                  </label>
                  <div className="mt-2">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      autoComplete="name"
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm/6 font-medium text-gray-900">
                    Email address
                  </label>
                  <div className="mt-2">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      autoComplete="email"
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm/6 font-medium text-gray-900">
                    Password
                  </label>
                  <div className="mt-2">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      autoComplete="new-password"
                      className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    />
                  </div>
                </div>

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
                        <option value="">Select a property...</option>
                        {properties.map((property, index) => (
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
                            <option value="">Select an existing property owner...</option>
                            {propertyOwners.map((owner, index) => (
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

                {error && <p className="text-red-500 text-sm/6">{error}</p>}

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-300"
                  >
                    {loading ? 'Processing...' : 'Sign up'}
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-10">
              <div className="relative">
                <div aria-hidden="true" className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm/6 font-medium">
                  <span className="bg-white px-6 text-gray-900">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4">
                <button
                  onClick={handleGoogleSignUp}
                  className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:ring-transparent"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                    <path
                      d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
                      fill="#EA4335"
                    />
                    <path
                      d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                      fill="#4285F4"
                    />
                    <path
                      d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.2654 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
                      fill="#34A853"
                    />
                  </svg>
                  <span className="text-sm/6 font-semibold">Google</span>
                </button>
              </div>
            </div>
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

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  );
}