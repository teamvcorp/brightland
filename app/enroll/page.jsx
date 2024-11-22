"use client"
import React, { useState } from "react";
import { useRouter } from "next/navigation"; // Ensure correct import for useRouter

export default function ContactUs() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    subject: "", // Included in state but not used in the form
    message: "",
    phone: "",
  });

  const { fullname, email, message, phone } = formData;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("/api/sendgrid/renters", {
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
    <div className="max-w-4xl mx-auto p-5">
      <h1 className="text-center text-2xl font-semibold mb-6">Contact Form</h1>
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <fieldset className="mb-4">
          <legend className="text-lg font-semibold mb-2">Details <span className="text-sm text-gray-500">Detalles de los padres</span></legend>
          <div className="mb-4">
            <label htmlFor="fullname" className="block text-gray-700 text-sm font-bold mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullname}
              onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
              name="fullname"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
              E-mail <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="phone" className="block text-gray-700 text-sm font-bold mb-2">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="phone"
              value={phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
        </fieldset>

        <div className="mb-6">
          <label htmlFor="message" className="block text-gray-700 text-sm font-bold mb-2">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            name="message"
            value={message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          ></textarea>
        </div>

        <div className="flex items-center justify-center">
          <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
