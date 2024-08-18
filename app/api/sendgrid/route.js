import sendgrid from "@sendgrid/mail";

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

export const POST = async (request) => {
  try {
    let body = await request.json();
    const {
      fullname,
      email,
      message,
      phone
    } = body;
    const emailTemplate =
         `<div>
            <p>Potenital Tennents name is: ${fullname}, they can be reached at the email address ${email}, or by phone ${phone}. </p>
          <p>They would like to scheudle a tour of the following apt.${message}
          </div>`;
    await sendgrid.send({
      to: "blandinvest@gmail.com", // Your email where you'll receive emails
      from: "teamVcorp@thevacorp.com", // your website email address here
      subject: `${fullname}`,
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
