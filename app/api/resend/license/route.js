import { Resend } from "resend";
import { NextResponse } from "next/server";
import { render } from "@react-email/render";
import { LicenseEmail } from "@/email/licenseEmail";
import PDFParser from "pdf2json";

const resend = new Resend(process.env.RESEND_API_KEY);

const parsePDF = (buffer) => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      const fields = pdfData.formImage.Fields.reduce((acc, field) => {
        acc[field.T] = field.V || "";
        return acc;
      }, {});
      resolve({
        day: fields.day || "",
        month: fields.month || "",
        year: fields.year || "",
        licensee_name: fields.licensee_name || "",
        premises_address: fields.premises_address || "",
        start_date: fields.start_date || "",
        monthly_payment: fields.monthly_payment || "",
        adults: fields.adults || "",
        child: fields.child || "",
        bank_name: fields.bank_name || "",
        routing_number: fields.routing_number || "",
        account_number: fields.account_number || "",
        account_holder: fields.account_holder || "",
        payment_frequency_weekly: fields.payment_frequency_weekly ? "true" : "",
        payment_frequency_biweekly: fields.payment_frequency_biweekly ? "true" : "",
        payment_frequency_monthly: fields.payment_frequency_monthly ? "true" : "",
        security_deposit: fields.security_deposit || "",
        licensor_signature: fields.licensor_signature || "",
        licensor_date: fields.licensor_date || "",
        licensee_signature: fields.licensee_signature || "",
        licensee_date: fields.licensee_date || "",
      });
    });
    pdfParser.on("pdfParser_dataError", (err) => reject(err));
    pdfParser.parseBuffer(buffer);
  });
};

export async function POST(request) {
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // Always process as FormData
    const formData = await request.formData();
    const file = formData.get("file");
    let licenseData;

    if (file) {
      // Parse PDF to extract form fields
      const pdfBuffer = await file.arrayBuffer();
      licenseData = await parsePDF(Buffer.from(pdfBuffer));
    } else {
      // Extract fields from FormData
      licenseData = {
        day: formData.get("day") || "",
        month: formData.get("month") || "",
        year: formData.get("year") || "",
        licensee_name: formData.get("licensee_name") || "",
        premises_address: formData.get("premises_address") || "",
        start_date: formData.get("start_date") || "",
        monthly_payment: formData.get("monthly_payment") || "",
        adults: formData.get("adults") || "",
        child: formData.get("child") || "",
        bank_name: formData.get("bank_name") || "",
        routing_number: formData.get("routing_number") || "",
        account_number: formData.get("account_number") || "",
        account_holder: formData.get("account_holder") || "",
        payment_frequency_weekly: formData.get("payment_frequency") === "Weekly" ? "true" : "",
        payment_frequency_biweekly: formData.get("payment_frequency") === "Bi-weekly" ? "true" : "",
        payment_frequency_monthly: formData.get("payment_frequency") === "Monthly" ? "true" : "",
        security_deposit: formData.get("security_deposit") || "",
        licensor_signature: formData.get("licensor_signature") || "",
        licensor_date: formData.get("licensor_date") || "",
        licensee_signature: formData.get("licensee_signature") || "",
        licensee_date: formData.get("licensee_date") || "",
      };
    }

    const {
      day,
      month,
      year,
      licensee_name,
      premises_address,
      start_date,
      monthly_payment,
      adults,
      child,
      bank_name,
      routing_number,
      account_number,
      account_holder,
      payment_frequency_weekly,
      payment_frequency_biweekly,
      payment_frequency_monthly,
      security_deposit,
      licensor_signature,
      licensor_date,
      licensee_signature,
      licensee_date,
    } = licenseData;

    // Validate required fields
    if (!licensee_name || !premises_address || !start_date || !monthly_payment || !adults || !child || !security_deposit) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Determine payment frequency
    const paymentFrequency = payment_frequency_weekly
      ? "Weekly"
      : payment_frequency_biweekly
      ? "Bi-weekly"
      : payment_frequency_monthly
      ? "Monthly"
      : "Not specified";

    // Render Ascertain that payment_frequency is set to a valid value
    if (!["Weekly", "Bi-weekly", "Monthly"].includes(paymentFrequency)) {
      return NextResponse.json(
        { error: "Invalid payment frequency" },
        { status: 400 }
      );
    }

    // Render the email template
    let emailHtml;
    try {
      emailHtml = await render(
        <LicenseEmail
          day={day}
          month={month}
          year={year}
          licensee_name={licensee_name}
          premises_address={premises_address}
          start_date={start_date}
          monthly_payment={monthly_payment}
          adults={adults}
          child={child}
          bank_name={bank_name}
          routing_number={routing_number}
          account_number={account_number}
          account_holder={account_holder}
          payment_frequency={paymentFrequency}
          security_deposit={security_deposit}
          licensor_signature={licensor_signature}
          licensor_date={licensor_date}
          licensee_signature={licensee_signature}
          licensee_date={licensee_date}
        />,
        { pretty: true }
      );

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

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "contact@your-domain.com",
      to: process.env.RESEND_TO_EMAIL || "your-receiving-email@domain.com",
      subject: `License to Occupy Agreement Submission from ${licensee_name}`,
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
      { message: "Agreement sent successfully", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}

// Body size limit is now handled by Next.js App Router automatically
// export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }; // Deprecated in Next.js 16