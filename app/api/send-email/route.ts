import { NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';

interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  from: string;
}

// Creates a nodemailer transporter using Gmail with OAuth2
async function createTransporter() {
  const email = process.env.NOTIFICATION_EMAIL || 'contactquranki@gmail.com';
  console.log('Creating email transporter for:', email);
  
  // Use password-based auth as fallback in development
  if (process.env.NODE_ENV === 'development' && process.env.NOTIFICATION_EMAIL_PASSWORD) {
    console.log('Using password-based authentication (development mode)');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email,
        pass: process.env.NOTIFICATION_EMAIL_PASSWORD,
      },
    });
  }
  
  try {
    // Use OAuth2 authentication (preferred for production)
    console.log('Attempting to use OAuth2 authentication');
    
    // Check if OAuth credentials are available
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || 
        !process.env.GMAIL_REFRESH_TOKEN) {
      console.error('Missing OAuth2 credentials');
      throw new Error('Missing required OAuth2 credentials');
    }
    
    // Create OAuth2 client
    const OAuth2 = google.auth.OAuth2;
    const oauth2Client = new OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );
    
    // Set refresh token
    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });
    
    // Get access token
    const accessToken = await new Promise<string>((resolve, reject) => {
      oauth2Client.getAccessToken((err: Error | null, token: string | null | undefined) => {
        if (err) {
          console.error('Failed to get access token:', err);
          reject(err);
        }
        resolve(token as string);
      });
    });
    
    console.log('Successfully retrieved OAuth2 access token');
    
    // Create transporter with OAuth2
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: email,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });
  } catch (error) {
    console.error('Error setting up OAuth2:', error);
    throw error;
  }
}

// Use Google's SMTP to send emails directly
export async function POST(request: Request) {
  try {
    // Check if we have required email credentials
    const hasCredentials = !!process.env.NOTIFICATION_EMAIL_PASSWORD;
    console.log('Email credentials check:', {
      hasPassword: hasCredentials,
      hasEmail: !!process.env.NOTIFICATION_EMAIL,
      environment: process.env.NODE_ENV
    });
    
    // Verify API key for security
    const apiKey = request.headers.get('X-API-Key');
    const configuredApiKey = process.env.NOTIFICATION_API_KEY;
    const isApiKeyValid = configuredApiKey && apiKey === configuredApiKey;
    console.log('API key validation:', {
      hasApiKey: !!apiKey,
      hasConfiguredKey: !!configuredApiKey,
      isValid: isApiKeyValid
    });
    
    // Check authentication
    const session = await auth();
    const isAdmin = session?.user?.email === 'admin@quranki.com';
    const isAuthenticated = !!session?.user;
    console.log('Authentication check:', {
      hasSession: !!session,
      isAdmin,
      isAuthenticated
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
    console.log('Received email request:', {
      to: emailData.to,
      subject: emailData.subject,
      hasText: !!emailData.text,
      textLength: emailData.text?.length
    });
    
    // Validate email data
    if (!emailData.to || !emailData.subject || !emailData.text) {
      console.error('Missing required email fields:', {
        hasTo: !!emailData.to,
        hasSubject: !!emailData.subject,
        hasText: !!emailData.text
      });
      return NextResponse.json(
        { error: 'Missing required email fields' },
        { status: 400 }
      );
    }

    // In development without credentials, just log email details
    if (process.env.NODE_ENV === 'development' && !hasCredentials) {
      console.log('Development mode email logging:', emailData);
      return NextResponse.json({
        success: true,
        message: 'Email logged (development mode)',
        note: 'No actual email was sent because NOTIFICATION_EMAIL_PASSWORD is not set'
      });
    }
    
    // Create a transporter with Gmail SMTP
    try {
      console.log('Attempting to create email transporter...');
      const transporter = await createTransporter();
      
      // Send email using Gmail
      console.log('Attempting to send email...');
      const info = await transporter.sendMail({
        from: emailData.from || `"QuranKi" <${process.env.NOTIFICATION_EMAIL || 'contactquranki@gmail.com'}>`,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
      });

      console.log('Email sent successfully:', {
        messageId: info.messageId,
        response: info.response
      });

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully via Gmail SMTP',
        messageId: info.messageId,
        response: info.response
      });
    } catch (emailError: any) {
      console.error('Error sending email with SMTP:', {
        error: emailError.message,
        code: emailError.code,
        command: emailError.command,
        response: emailError.response,
        stack: emailError.stack
      });
      throw new Error(`Failed to send email: ${emailError.message}`);
    }
  } catch (error: any) {
    console.error('Error in send-email API route:', {
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
} 