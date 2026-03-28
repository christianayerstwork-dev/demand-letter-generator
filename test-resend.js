// Quick test script to verify Resend API key
const { Resend } = require('resend');

const resend = new Resend('re_6eaW1v2a_4JNkxNpTPHRiZuxk3KdNPmVX');

async function test() {
  try {
    console.log('Testing Resend API key...');
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'delivered@resend.dev', // Resend's test email
      subject: 'Test Email',
      html: '<p>This is a test</p>'
    });
    console.log('✅ SUCCESS! Email sent:', result);
  } catch (error) {
    console.log('❌ ERROR:', error);
  }
}

test();
