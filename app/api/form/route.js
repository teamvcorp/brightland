export const POST = async (req, res) => {
  // Get data submitted in request's body.
  const body = req.body;

  // Optional logging to see the responses
  // in the command line where next.js app is running.
  console.log("body: ", JSON.parse(body));

  // Guard clause checks for first and last name,
  // and returns early if they are not found
  if (!body.first || !body.last) {
    // Sends a HTTP bad request error code
    return new Response("First or last name not found", { status: 500 });
  }

  // Found the name.
  // Sends a HTTP success code
  return new Response(JSON.stringify({ data: `${body.first} ${body.last}` }));
};
