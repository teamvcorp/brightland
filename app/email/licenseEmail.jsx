import { Html, Head, Body, Container, Section, Heading, Text } from "@react-email/components";

export const LicenseEmail = ({
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
  payment_frequency,
  security_deposit,
  licensor_signature,
  licensor_date,
  licensee_signature,
  licensee_date,
}) => (
  <Html>
    <Head />
    <Body style={{ fontFamily: "Arial, sans-serif", color: "#333" }}>
      <Container style={{ maxWidth: "600px", padding: "20px" }}>
        <Section style={{ background: "#f8f8f8", padding: "15px", textAlign: "center" }}>
          <Heading style={{ color: "#1a73e8" }}>
            New License to Occupy Agreement Submission
          </Heading>
        </Section>
        <Section style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "5px" }}>
          <Text><strong>Agreement Date:</strong> {day} {month}, 20{year}</Text>
          <Text><strong>Licensee Name:</strong> {licensee_name}</Text>
          <Text><strong>Premises Address:</strong> {premises_address}</Text>
          <Text><strong>Start Date:</strong> {start_date}</Text>
          <Text><strong>Monthly Payment:</strong> ${monthly_payment}</Text>
          <Text><strong>Occupancy:</strong> {adults} adult(s), {child} child(ren)</Text>
          <Text><strong>Payment Frequency:</strong> {payment_frequency}</Text>
          <Text><strong>Bank Name:</strong> {bank_name}</Text>
          <Text><strong>Routing Number:</strong> {routing_number}</Text>
          <Text><strong>Account Number (Last 4 Digits):</strong> {account_number}</Text>
          <Text><strong>Account Holder:</strong> {account_holder}</Text>
          <Text><strong>Security Deposit:</strong> ${security_deposit}</Text>
          <Text><strong>Licensor Signature:</strong> {licensor_signature}</Text>
          <Text><strong>Licensor Date:</strong> {licensor_date}</Text>
          <Text><strong>Licensee Signature:</strong> {licensee_signature}</Text>
          <Text><strong>Licensee Date:</strong> {licensee_date}</Text>
        </Section>
        <Text style={{ textAlign: "center", fontSize: "12px", color: "#777", marginTop: "20px" }}>
          Sent from Your Website License Agreement Form
        </Text>
      </Container>
    </Body>
  </Html>
);