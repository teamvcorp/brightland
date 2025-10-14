import { Html, Head, Body, Container, Section, Heading, Text, Img } from "@react-email/components";

export const ContactEmailManager = ({ fullname, email, phone, address, projectDescription, message, problemImageUrl }) => (
  <Html>
    <Head />
    <Body style={{ fontFamily: "Arial, sans-serif", color: "#333" }}>
      <Container style={{ maxWidth: "600px", padding: "20px" }}>
        <Section style={{ background: "#f8f8f8", padding: "15px", textAlign: "center" }}>
          <Heading style={{ color: "#1a73e8" }}>
            Maintenance Request Submission
          </Heading>
        </Section>
        <Section style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "5px" }}>
          <Text><strong>Name:</strong> {fullname}</Text>
          <Text><strong>Email:</strong> {email}</Text>
          <Text><strong>Phone:</strong> {phone}</Text>
          <Text><strong>Address:</strong> {address}</Text>
          <Text><strong>Project Description:</strong> {projectDescription}</Text>
          <Text><strong>Message:</strong> {message}</Text>
          {problemImageUrl && (
            <>
              <Text><strong>Problem Image:</strong></Text>
              <Img 
                src={problemImageUrl} 
                alt="Problem reported" 
                width="400"
                style={{ maxWidth: "400px", height: "auto", border: "1px solid #ddd", borderRadius: "5px" }}
              />
            </>
          )}
        </Section>
        <Text style={{ textAlign: "center", fontSize: "12px", color: "#777", marginTop: "20px" }}>
          Sent from Brightland Properties Maintenance System
        </Text>
      </Container>
    </Body>
  </Html>
);