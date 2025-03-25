import { NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import nodemailer from 'nodemailer';

interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  from: string;
}

// Creates a nodemailer transporter using Gmail SMTP
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.NOTIFICATION_EMAIL || 'contactquranki@gmail.com',
      pass: process.env.NOTIFICATION_EMAIL_PASSWORD, // Use your Google App Password here
    },
  });
}

// Use Google's SMTP to send emails directly
export async function POST(request: Request) {
  try {
    // Check if we have required email credentials
    const hasCredentials = !!process.env.NOTIFICATION_EMAIL_PASSWORD;
    
    // Verify API key for security
    const apiKey = request.headers.get('X-API-Key');
    const configuredApiKey = process.env.NOTIFICATION_API_KEY;
    const isApiKeyValid = configuredApiKey && apiKey === configuredApiKey;
    
    // Check authentication
    const session = await auth();
    const isAdmin = session?.user?.email === 'admin@quranki.com';
    const isAuthenticated = !!session?.user;
    
    // For debugging authentication issues
    console.log('API authentication check:', {
      hasApiKey: !!apiKey,
      configuredApiKeyExists: !!configuredApiKey,
      apiKeyMatches: isApiKeyValid,
      isLoggedIn: isAuthenticated,
      isAdmin
    });
    
    // Allow access if either API key is valid or user is admin
    if (!isApiKeyValid && !isAdmin) {
      console.error('Unauthorized access attempt to send-email API');
      return NextResponse.json(
        { error: 'Unauthorized access. Missing or invalid API key.' },
        { status: 401 }
      );
    }
    
    // Get email data from request
    const emailData = await request.json() as EmailPayload;
    
    // Validate email data
    if (!emailData.to || !emailData.subject || !emailData.text) {
      return NextResponse.json(
        { error: 'Missing required email fields' },
        { status: 400 }
      );
    }

    // In development without credentials, just log email details
    if (process.env.NODE_ENV === 'development' && !hasCredentials) {
      console.log('📧 Email would be sent (NO CREDENTIALS PROVIDED):');
      console.log('To:', emailData.to);
      console.log('Subject:', emailData.subject);
      console.log('Text:', emailData.text);
      
      return NextResponse.json({
        success: true,
        message: 'Email logged (development mode)',
        note: 'No actual email was sent because NOTIFICATION_EMAIL_PASSWORD is not set'
      });
    }
    
    // Create a transporter with Gmail SMTP
    try {
      const transporter = createTransporter();
      
      console.log(`Attempting to send email to ${emailData.to}`);
      
      // Send email using Gmail
      const info = await transporter.sendMail({
        from: emailData.from || `"QuranKi" <${process.env.NOTIFICATION_EMAIL || 'contactquranki@gmail.com'}>`,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
      });
      
      console.log('Email sent successfully:', info.messageId);
      
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully via Gmail SMTP',
        messageId: info.messageId
      });
    } catch (emailError: any) {
      console.error('Error sending email with SMTP:', emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }
  } catch (error: any) {
    console.error('Error in send-email API route:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
} 