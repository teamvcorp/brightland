import { Resend } from "resend";
import { NextResponse } from "next/server";
import { render } from "@react-email/render";
import { ContactEmailManager } from "@/email/ContactEmailManager";
import { connectToDatabase } from '@/lib/mongodb';
import { ManagerRequestModel } from '@/models/ManagerRequest';
import { UserModel } from '@/models/User';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    await connectToDatabase();
    
    const requestBody = await request.json();
    const { fullname, email, phone, address, propertyName, projectDescription, message, problemImageUrl, userType, proposedBudget } = requestBody;

    console.log('===== MANAGER REQUEST DEBUG =====');
    console.log('Full request body:', JSON.stringify(requestBody, null, 2));
    console.log('propertyName field:', propertyName);
    console.log('proposedBudget field:', proposedBudget);
    console.log('userType:', userType || 'tenant');
    console.log('================================');

    if (!fullname || !email || !phone || !address || !projectDescription || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!email.match(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (!phone.match(/^\+?[\d\s-]{10,}$/)) {
      return NextResponse.json(
        { error: "Invalid phone format" },
        { status: 400 }
      );
    }

    if (!address.trim()) {
      return NextResponse.json(
        { error: "Address cannot be empty" },
        { status: 400 }
      );
    }

    if (!projectDescription.trim()) {
      return NextResponse.json(
        { error: "Project description cannot be empty" },
        { status: 400 }
      );
    }

    // Save the request to the database
    const dataToSave = {
      fullname,
      email,
      phone,
      address,
      propertyName: propertyName || address, // Use address as fallback if propertyName not provided
      projectDescription,
      message,
      problemImageUrl,
      userType: userType || 'tenant', // Default to tenant if not specified
      proposedBudget: proposedBudget || null,
      status: 'pending'
    };
    
    console.log('===== SAVING TO DATABASE =====');
    console.log('Data to save:', JSON.stringify(dataToSave, null, 2));
    console.log('==============================');
    
    const managerRequest = await ManagerRequestModel.create(dataToSave);

    // Update user's phone number if they provided one and it's different from what's stored
    try {
      const user = await UserModel.findOne({ email });
      if (user && phone && phone.trim() && (!user.phone || user.phone !== phone)) {
        user.phone = phone;
        await user.save();
        console.log(`Updated phone number for user ${email}: ${phone}`);
      }
    } catch (phoneUpdateError) {
      console.error('Error updating user phone number:', phoneUpdateError);
      // Don't fail the request if phone update fails, just log it
    }

    // Render the email template
    let emailHtml;
    try {
        console.log('Rendering email with data:', {
          fullname,
          email,
          phone,
          address,
          projectDescription,
          message,
          problemImageUrl: problemImageUrl ? 'present' : 'none',
          userType
        });

        emailHtml = await render(
        <ContactEmailManager
          fullname={fullname}
          email={email}
          phone={phone}
          address={address}
          projectDescription={projectDescription}
          message={message}
          problemImageUrl={problemImageUrl}
        />,
        { pretty: true } // Formats HTML for better readability
      );      
      
      // Validate that emailHtml is a string
      if (typeof emailHtml !== "string" || emailHtml.trim() === "") {
        console.error("Invalid emailHtml:", emailHtml);
        return NextResponse.json(
          { error: "Failed to render email template" },
          { status: 500 }
        );
      }
    } catch (renderError) {
      console.error("Render error:", renderError);
      return NextResponse.json(
        { error: "Failed to render email template" },
        { status: 500 }
      );
    }

    // Log the rendered HTML for debugging
    console.log("Rendered emailHtml length:", emailHtml.length, "characters");
    console.log("First 200 chars:", emailHtml.substring(0, 200));

    // Determine email subject based on user type
    const isPropertyOwner = userType === 'property-owner';
    const isHomeOwner = userType === 'home-owner';
    
    let emailSubject;
    if (isPropertyOwner) {
      emailSubject = `Property Owner Maintenance Request - ${address}`;
    } else if (isHomeOwner) {
      emailSubject = `Home Owner Repair Request - ${address}`;
    } else {
      emailSubject = `Tenant Maintenance Request - ${address}`;
    }

    console.log('Sending email with subject:', emailSubject);

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "contact@your-domain.com",
      to: process.env.RESEND_TO_EMAIL || "your-receiving-email@domain.com",
      subject: emailSubject,
      html: emailHtml,
    });

    if (error) {
      console.error("Resend API error:", error);
      return NextResponse.json(
        { error: "Failed to send email: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Request submitted successfully", requestId: managerRequest._id, data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}