import { Resend } from "resend";
import { NextResponse } from "next/server";
import { render } from "@react-email/render";
import { ContactEmail } from "@/email/ContactEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { fullname, email, phone, message, listingName, listingType } = await request.json();

    if (!fullname || !email || !phone || !message) {
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

    // Render the email template
    let emailHtml;
    try {
      emailHtml = await render(
        <ContactEmail
          fullname={fullname}
          email={email}
          phone={phone}
          message={message}
          listingName={listingName}
          listingType={listingType}
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
    console.log("Rendered emailHtml:", emailHtml.substring(0, 200)); // Log first 200 chars to avoid clutter

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "contact@your-domain.com",
      to: process.env.RESEND_TO_EMAIL || "your-receiving-email@domain.com",
      subject: `Contact Form Submission${listingName ? ` for ${listingName}` : ""}`,
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
      { message: "Email sent successfully", data },
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