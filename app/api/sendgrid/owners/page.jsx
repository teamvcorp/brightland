'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const OwnersPage = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
      fullname: "",
      email: "",
      address: "",
      message: "",
      phone: "",
    });
 

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

  
    const handleSubmit = async (e) => {
      e.preventDefault();
  
      const res = await fetch("/api/sendgrid", {
        method: "POST",
        body: JSON.stringify(formData),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
  
      if (res.ok) {
        router.push('/'); // Redirect only if request is successful
      }
    };
  

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-blue-600 text-white p-4">
                <h1 className="text-2xl font-bold">Owners Dashboard</h1>
            </header>
            <nav className="bg-blue-500 text-white p-3">
                
            </nav>
            <main className="p-6">
                <h2 className="text-xl font-semibold mb-4">Welcome to the Owners Dashboard</h2>
                <p>The purpose of this page is to collect your basic information. By submitting this contact form you can expect a prompt reponse. </p>
      

                <section className="bg-white p-6 rounded-lg shadow-lg max-w-lg mx-auto">
                    <h3 className="text-lg font-bold mb-4">Request a Quote</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block font-medium mb-1">Name:</label>
                            <input
                                type="text"
                                id="fullname"
                                name="fullname"
                                value={formData.fullname}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block font-medium mb-1">Email:</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="address" className="block font-medium mb-1">Address:</label>
                            <input
                                type="text"
                                id="address"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="phone" className="block font-medium mb-1">Phone:</label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="message" className="block font-medium mb-1">Project Description:</label>
                            <textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows="4"
                                required
                            ></textarea>
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Submit Request
                        </button>
                    </form>
                </section>
            </main>
            <footer className="bg-gray-800 text-white text-center p-4 mt-6">
                <p>&copy; 2023 Brightland Property Management</p>
            </footer>
        </div>
    );
};

export default OwnersPage;
