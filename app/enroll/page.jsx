"use client";

import React, { useState } from "react";
import {  useRouter } from "next/navigation";
import "./enroll.css";

export default function ContactUs() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    subject: "",
    message: "",
    phone: "",
  });
  const {
    fullname,
    email,
    message,
    phone,
  } = formData;

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
    router.push('/')
  };

  return (
    <div className="formContainer">
      <h5 className="formH1">Tour Form</h5>
      <form onSubmit={handleSubmit} className="formBackground">
        <fieldset className="formSection">
          <legend> <strong>Details</strong> <i> Detalles de los padres </i> </legend>

          <label htmlFor="fullname" className="">
            Full Name <p className="fontBlack spanish"><i> Nombre Completo </i> <span className="text-red-500 dark:text-gray-50">*</span></p> 
            
          </label>
          <input
            type="text"
            value={fullname}
            onChange={(e) => {
              setFormData({ ...formData, fullname: e.target.value });
            }}
            name="fullname"
            className="formInput"
            required
          />

          <label htmlFor="email" className="">
            E-mail <p className="fontBlack spanish"> <i>Correo Electrónico</i><span className="text-red-500">*</span></p> 
          </label>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
            }}
            className="formInput"
            required
          />
          <label htmlFor="phone" className="">
            Phone <p className="fontBlack spanish"> <i> Teléfono </i><span className="text-red-500">*</span> </p> 
          </label>
          <input
            type="text"
            name="phone"
            value={phone}
            onChange={(e) => {
              setFormData({ ...formData, phone: e.target.value });
            }}
            className="formInput"
            required
          />
        </fieldset>

            <div className="formSectionMessage">

        <label htmlFor="message" className="message">
          Message: PLease mention the Apartment you are interested in.<span className="text-red-500">*</span>
        </label>
        <textarea
          name="message"
          value={message}
          onChange={(e) => {
            setFormData({ ...formData, message: e.target.value });
          }}
          className="formMessage"
          ></textarea>
          </div>

        <div className="formSubmitBtnContainer">
          <button type="submit" className="btn formSubmitBtn">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
