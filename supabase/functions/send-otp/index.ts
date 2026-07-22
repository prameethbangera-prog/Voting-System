// deno-lint-ignore-file no-explicit-any
// @ts-ignore - Deno runtime imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

declare const Deno: any;

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "noreply@securevotechain.com";

interface OTPEmailRequest {
  email: string;
  otp: string;
  expiresIn: number; // in minutes
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

serve(async (req: any) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { email, otp, expiresIn }: OTPEmailRequest = await req.json();

    // Validate input
    if (!email || !otp || !expiresIn) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, otp, expiresIn" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if Resend API key is configured
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      // For development, we can still return success but log a warning
      console.warn("Email service not configured - OTP would be sent to:", email);
      return new Response(
        JSON.stringify({
          success: true,
          message: "OTP email queued (dev mode - check logs)",
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Prepare email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9fafb;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .otp-box {
              background-color: #f3f4f6;
              border: 2px solid #2563eb;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
            }
            .otp-code {
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 4px;
              color: #2563eb;
              font-family: 'Courier New', monospace;
            }
            .expiry {
              color: #6b7280;
              font-size: 14px;
              margin-top: 15px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #9ca3af;
              font-size: 12px;
            }
            .warning {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 10px 15px;
              margin: 15px 0;
              border-radius: 4px;
              font-size: 14px;
              color: #92400e;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🗳️ SecureVote Chain</div>
            </div>
            <div class="content">
              <h2>Your Verification Code</h2>
              <p>Hello,</p>
              <p>You requested a verification code to access the SecureVote Chain voting system. Use the code below to complete your verification:</p>
              
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
                <div class="expiry">Valid for ${expiresIn} minutes</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> Never share this code with anyone. SecureVote Chain staff will never ask for your code.
              </div>
              
              <p style="margin-top: 20px;">If you didn't request this code, you can safely ignore this email.</p>
              
              <div class="footer">
                <p>© 2026 SecureVote Chain. All rights reserved.</p>
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const plainText = `
Your SecureVote Chain Verification Code: ${otp}

This code will expire in ${expiresIn} minutes.

If you didn't request this code, you can ignore this email.

--- 
SecureVote Chain © 2026
    `;

    // Send email via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: "Your SecureVote Chain Verification Code",
        html: emailHtml,
        text: plainText,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", result);
      return new Response(
        JSON.stringify({
          error: "Failed to send email",
          details: result.message,
        }),
        { status: response.status, headers: corsHeaders }
      );
    }

    console.log(`OTP email sent successfully to ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully",
        messageId: result.id,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error in send-otp function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
