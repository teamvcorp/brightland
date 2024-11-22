import sendgrid from "@sendgrid/mail";

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

export const POST = async (request) => {
  try {
    let body = await request.json();
    const {
      fullname,
      email,
      address,
      message,
      phone
    } = body;
    const emailTemplate =
         `<div>
            <p>Potenital Renter name is: ${fullname}, they can be reached at the email address ${email}, or by phone ${phone}. </p>
          <p>They would like to talk about, ${message} the project is located at ${address}. This is a home owner.</p>
          </div>`;
    await sendgrid.send({
      to: "admin@thevacorp.com", // Your email where you'll receive emails
      from: "teamVcorp@thevacorp.com", // your website email address here
      subject: `#brightland ${fullname}`,
      html: emailTemplate,
    });
    return new Response(JSON.stringify("You request was sent, succesfully."), {
      status: 200,
    });
  } catch (error) {
    // console.log(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.statusCode || 500,
    });
    // return res.status(error.statusCode || 500).json({ error: error.message });
  }
};
