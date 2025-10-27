import { Html, Head, Body, Container, Section, Heading, Text, Img, Button } from "@react-email/components";

export const ContactEmailManager = ({ 
  fullname, 
  email, 
  phone, 
  address, 
  projectDescription, 
  message, 
  problemImageUrl,
  requiresApproval = false,
  proposedBudget = null,
  submittedBy = 'user'
}) => (
  <Html>
    <Head />
    <Body style={{ fontFamily: "Arial, sans-serif", color: "#333" }}>
      <Container style={{ maxWidth: "600px", padding: "20px" }}>
        <Section style={{ background: "#f8f8f8", padding: "15px", textAlign: "center" }}>
          <Heading style={{ color: "#1a73e8" }}>
            {requiresApproval ? '🔔 Repair Request Requires Your Approval' : 'Maintenance Request Submission'}
          </Heading>
        </Section>
        
        {requiresApproval && (
          <Section style={{ 
            padding: "15px", 
            background: "#fff3cd", 
            border: "2px solid #ffc107", 
            borderRadius: "5px",
            marginTop: "15px"
          }}>
            <Text style={{ margin: "0", fontWeight: "bold", color: "#856404" }}>
              ⚠️ ACTION REQUIRED: This repair request needs your approval before work can begin.
            </Text>
            <Text style={{ margin: "10px 0 0 0", color: "#856404" }}>
              Please review the details below and approve or decline in your dashboard.
            </Text>
          </Section>
        )}
        
        <Section style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "5px", marginTop: "15px" }}>
          {submittedBy === 'admin' && (
            <Text style={{ 
              padding: "10px", 
              background: "#e3f2fd", 
              borderRadius: "5px",
              fontWeight: "bold",
              color: "#1565c0"
            }}>
              👤 Submitted by: Admin
            </Text>
          )}
          <Text><strong>Name:</strong> {fullname}</Text>
          <Text><strong>Email:</strong> {email}</Text>
          <Text><strong>Phone:</strong> {phone}</Text>
          <Text><strong>Property Address:</strong> {address}</Text>
          <Text><strong>Issue:</strong> {projectDescription}</Text>
          <Text><strong>Details:</strong> {message}</Text>
          {proposedBudget && (
            <Text><strong>Estimated Budget:</strong> ${proposedBudget.toFixed(2)}</Text>
          )}
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
        
        {requiresApproval && (
          <Section style={{ padding: "20px", textAlign: "center", marginTop: "20px" }}>
            <Button
              href={`${process.env.NEXTAUTH_URL || 'https://yourdomain.com'}/property-owner-dashboard`}
              style={{
                background: "#1a73e8",
                color: "#fff",
                padding: "12px 30px",
                borderRadius: "5px",
                textDecoration: "none",
                fontWeight: "bold",
                display: "inline-block"
              }}
            >
              View in Dashboard & Approve/Decline
            </Button>
          </Section>
        )}
        
        <Text style={{ textAlign: "center", fontSize: "12px", color: "#777", marginTop: "20px" }}>
          Sent from Brightland Properties Maintenance System
        </Text>
      </Container>
    </Body>
  </Html>
);