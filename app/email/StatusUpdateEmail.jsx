import { Html, Head, Body, Container, Section, Heading, Text, Img } from "@react-email/components";

export const StatusUpdateEmail = ({ fullname, address, projectDescription, oldStatus, newStatus, adminNotes, finishedImageUrl }) => (
  <Html>
    <Head />
    <Body style={{ fontFamily: "Arial, sans-serif", color: "#333" }}>
      <Container style={{ maxWidth: "600px", padding: "20px" }}>
        <Section style={{ background: "#f8f8f8", padding: "15px", textAlign: "center" }}>
          <Heading style={{ color: "#1a73e8" }}>
            Maintenance Request Update
          </Heading>
        </Section>
        <Section style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "5px" }}>
          <Text>Hello {fullname},</Text>
          <Text>
            We have an update on your maintenance request for <strong>{address}</strong>.
          </Text>
          <Text><strong>Project:</strong> {projectDescription}</Text>
          <Text>
            <strong>Status has been updated from:</strong> {oldStatus} → {newStatus}
          </Text>
          {adminNotes && (
            <>
              <Text><strong>Notes from our team:</strong></Text>
              <Text style={{ background: "#f9f9f9", padding: "10px", borderLeft: "3px solid #1a73e8" }}>
                {adminNotes}
              </Text>
            </>
          )}
          {finishedImageUrl && newStatus === 'finished' && (
            <>
              <Text><strong>Completed Work Photo:</strong></Text>
              <Img 
                src={finishedImageUrl} 
                alt="Completed maintenance work" 
                width="400"
                style={{ maxWidth: "400px", height: "auto", border: "1px solid #ddd", borderRadius: "5px" }}
              />
            </>
          )}
          {finishedImageUrl && newStatus === 'working' && (
            <>
              <Text><strong>Work Progress Photo:</strong></Text>
              <Img 
                src={finishedImageUrl} 
                alt="Maintenance work in progress" 
                width="400"
                style={{ maxWidth: "400px", height: "auto", border: "1px solid #ddd", borderRadius: "5px" }}
              />
            </>
          )}
          <Text>
            Thank you for choosing Brightland Properties. If you have any questions, please don&apos;t hesitate to contact us.
          </Text>
          <Text>
            Best regards,<br />
            Brightland Properties Team
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);