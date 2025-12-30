import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // TODO: Integrate with your email marketing service
    // Examples:
    // - ConvertKit: https://developers.convertkit.com/#create-a-subscriber
    // - Mailchimp: https://mailchimp.com/developer/marketing/api/list-members/
    // - SendGrid: https://docs.sendgrid.com/api-reference/contacts/add-or-update-a-contact

    // For now, log the email (replace with actual integration)
    console.log('New email subscription:', email);

    // Example: ConvertKit integration (uncomment and configure when ready)
    /*
    const CONVERTKIT_API_KEY = process.env.CONVERTKIT_API_KEY;
    const CONVERTKIT_FORM_ID = process.env.CONVERTKIT_FORM_ID;

    const response = await fetch(
      `https://api.convertkit.com/v3/forms/${CONVERTKIT_FORM_ID}/subscribe`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: CONVERTKIT_API_KEY,
          email: email,
          tags: ['website-popup'], // Optional: tag subscribers
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to subscribe');
    }
    */

    // Example: Simple file storage (for development/testing)
    // In production, use a proper database or email service
    if (process.env.NODE_ENV === 'development') {
      const fs = require('fs').promises;
      const path = require('path');
      const emailsFile = path.join(process.cwd(), 'emails.txt');

      try {
        await fs.appendFile(emailsFile, `${email}\n`);
      } catch (err) {
        console.error('Error saving email:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed!',
    });
  } catch (error) {
    console.error('Email subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again.' },
      { status: 500 }
    );
  }
}
