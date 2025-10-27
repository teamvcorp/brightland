'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useProperties, usePropertyOwners } from '../hooks';

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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  
  // Use custom hooks for data fetching
  const { properties, loading: propertiesLoading } = useProperties();
  const { propertyOwners, loading: ownersLoading } = usePropertyOwners();
  
  // Get callback URL from search params
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  // Redirect if already logged in
  useEffect(() => {
    if (status === 'loading') return;
    
    if (session?.user) {
      // User is already logged in, redirect them to signin page
      // (This shouldn't normally happen, but if they navigate to /signup while logged in)
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent(callbackUrl));
    }
  }, [session, status, router, callbackUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Starting signup process...');
      
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log('Signup API response:', { status: response.status, data });

      if (!response.ok) {
        if (response.status === 409) {
          // User already exists, redirect to signin with the same callback URL
          setError(data.message || 'Account already exists. Redirecting to sign in...');
          setTimeout(() => {
            const signinUrl = `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
            console.log('Redirecting to:', signinUrl);
            router.push(signinUrl);
          }, 2000);
          return;
        }
        throw new Error(data.message || 'Failed to create user');
      }

      console.log('User created successfully, attempting sign in...');

      // Attempt to sign in
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
        callbackUrl: callbackUrl
      });

      console.log('Sign in result:', result);

      if (result?.error) {
        console.error('Sign in error:', result.error);
        throw new Error('Account created but failed to sign in automatically. Please try signing in manually.');
      }

      if (result?.ok) {
        console.log('Sign in successful, redirecting...');
        
        // Show success message before redirect
        setError('Account created successfully! Redirecting...');
        
        // Small delay to show success message
        setTimeout(() => {
          // Route based on user type and callback URL
          if (formData.userType === 'property-owner') {
            router.push('/property-owner-dashboard');
          } else if (callbackUrl && callbackUrl !== '/dashboard') {
            // If there's a specific callback URL (like rental application), use it
            console.log('Redirecting to callback URL:', callbackUrl);
            router.push(callbackUrl);
          } else {
            router.push('/dashboard');
          }
        }, 1000);
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Something went wrong during signup');
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
    <div className="flex bg-gray-100 ">
      <div className="flex flex-1 flex-col justify-center px-4 py-6 sm:px-6 lg:flex-none lg:px-20 xl:px-24 ">
        <div className="mx-auto w-full max-w-sm lg:w-96 ">
          <div>
       
            <h2 className=" text-2xl/9 font-bold tracking-tight text-gray-900">Create your account</h2>
            <p className="mt-2 text-sm/6 text-gray-500">
              Already have an account?{' '}
              <a href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-semibold text-indigo-600 hover:text-indigo-500">
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
                        <option value="">{propertiesLoading ? 'Loading properties...' : 'Select a property...'}</option>
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
                            <option value="">{ownersLoading ? 'Loading property owners...' : 'Select an existing property owner...'}</option>
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
                  <div className={`p-3 rounded-md text-sm/6 ${
                    error.includes('successfully') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
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
                        Creating account...
                      </div>
                    ) : (
                      'Sign up'
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="">
              <div className="relative">
                <div aria-hidden="true" className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm/6 font-medium">
                  <span className=" px-6 my-4 text-gray-900">Or continue with</span>
                </div>
              </div>

              <div className=" grid grid-cols-1 ">
                <button
                  onClick={handleGoogleSignUp}
                  className="flex w-full items-center justify-center gap-3 rounded-md mb-10  px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus-visible:ring-transparent"
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