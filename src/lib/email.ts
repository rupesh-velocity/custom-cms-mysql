import { prisma } from '@/lib/prisma';
import { createSmtpTransport, getSmtpSettings } from '@/lib/smtp';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  try {
    const settings = await getSmtpSettings();
    if (!settings.enabled) {
      return { success: false, error: new Error('SMTP add-on is disabled') };
    }
    if (!settings.host) {
      return { success: false, error: new Error('SMTP host is not configured') };
    }

    let fromAddress = `"${settings.fromName}" <${settings.fromEmail || settings.user}>`;
    let toAddress = to;
    if (to.includes('__FROM_NAME__')) {
      const parts = to.split('__FROM_NAME__');
      fromAddress = `"${parts[1] || settings.fromName}" <${settings.fromEmail || settings.user}>`;
      toAddress = parts[0];
    }

    const transporter = createSmtpTransport(settings);
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toAddress,
      replyTo: settings.replyTo || undefined,
      subject,
      html,
    });

    console.log('Message sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

export async function sendCoursePurchaseEmail(userEmail: string, userName: string, courseName: string, amount: string, orderNumber: string) {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ['emailSenderName', 'emailLogoUrl', 'emailTemplateSuccess', 'adminEmail', 'emailPrimaryColor', 'emailSubjectSuccess'] } }
  });
  
  const settingsMap = settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value || '';
    return acc;
  }, {} as Record<string, string>);

  const senderName = settingsMap.emailSenderName || 'Website';
  const logoUrl = settingsMap.emailLogoUrl;
  const primaryColor = settingsMap.emailPrimaryColor || '#5e3fde';
  
  // Default template if none exists
  let customText = settingsMap.emailTemplateSuccess || "Your purchase of {courseName} was successful. You now have full access to this course.";
  customText = customText.replace(/{courseName}/g, courseName).replace(/{amount}/g, amount);

  let subject = settingsMap.emailSubjectSuccess || "Your receipt for {courseName}";
  subject = subject.replace(/{courseName}/g, courseName).replace(/{amount}/g, amount);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
      ${logoUrl ? `<div style="text-align: center; padding: 20px; background: #fff; border-bottom: 1px solid #eaeaea;"><img src="${logoUrl}" alt="Logo" style="max-height: 60px; max-width: 100%;" /></div>` : ''}
      <div style="background-color: ${primaryColor}; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Thank you for your purchase!</h1>
      </div>
      <div style="padding: 32px;">
        <p style="font-size: 16px; color: #333;">Hello,</p>
        <p style="font-size: 16px; color: #333; line-height: 1.5; white-space: pre-wrap;">
          ${customText}
        </p>
        <div style="background-color: #f6f7f7; padding: 16px; border-radius: 6px; margin: 24px 0;">
          <h3 style="margin-top: 0; color: #111;">Order Details</h3>
          <p style="margin: 0; color: #555;">Order Number: <strong>${orderNumber}</strong></p>
          <p style="margin: 8px 0 0 0; color: #555;">Item: ${courseName}</p>
          <p style="margin: 8px 0 0 0; color: #555;">Total Paid: <strong>$${amount}</strong></p>
        </div>
        <p style="font-size: 16px; color: #333; margin-top: 32px;">
          Happy learning!<br>
          <span style="color: #666;">- ${senderName}</span>
        </p>
      </div>
    </div>
  `;

  // We pass the senderName via a hack in the 'to' field so sendEmail can extract it, 
  // since sendEmail only takes { to, subject, html }. 
  // A better way is to update SendEmailParams, let's just do that in the signature above if possible.
  // Wait, I can't easily change the interface above without a bigger regex chunk. I'll use the hack:
  const result = await sendEmail({ to: `${userEmail}__FROM_NAME__${senderName}`, subject, html });

  try {
    const adminEmail = settingsMap.adminEmail;
    if (adminEmail) {
      const adminHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
          ${logoUrl ? `<div style="text-align: center; padding: 20px; background: #fff; border-bottom: 1px solid #eaeaea;"><img src="${logoUrl}" alt="Logo" style="max-height: 60px; max-width: 100%;" /></div>` : ''}
          <div style="background-color: ${primaryColor}; padding: 24px; text-align: center;">
            <h2 style="margin: 0; color: white;">New Order! 🎉</h2>
          </div>
          <div style="padding: 32px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 24px;">You’ve received a new order from <strong>${userName || userEmail}</strong>${userName && userName !== userEmail ? ` (${userEmail})` : ''}.</p>
            
            <div style="background-color: #f6f7f7; border: 1px solid #eaeaea; border-radius: 6px; padding: 16px;">
              <h3 style="margin-top: 0; color: #111; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Order Details</h3>
              <p style="margin: 8px 0; color: #555;"><strong>Order Number:</strong> ${orderNumber}</p>
              <p style="margin: 8px 0; color: #555;"><strong>Item:</strong> ${courseName}</p>
              <p style="margin: 8px 0 0; color: #555;"><strong>Total Paid:</strong> <span style="color: #28a745; font-weight: bold;">$${amount}</span></p>
            </div>
            
            <p style="font-size: 14px; color: #777; margin-top: 24px; text-align: center;">You can view the full order details in your admin dashboard.</p>
          </div>
        </div>
      `;
      await sendEmail({ 
        to: `${adminEmail}__FROM_NAME__${senderName}`, 
        subject: `New Order: ${orderNumber}`, 
        html: adminHtml 
      });
    }
  } catch (err) {
    console.error("Failed to send admin email", err);
  }

  return result;
}
