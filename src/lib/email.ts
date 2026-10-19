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
  const logoUrl = toAbsoluteAssetUrl(settingsMap.emailLogoUrl);
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getAbsoluteSiteUrl() {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://fitnessarts.com'
  ).replace(/\/$/, '');

  // Email clients cannot load images or links from localhost.
  // Use the public website URL when testing locally.
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(siteUrl)) {
    return 'https://fitnessarts.com';
  }

  return siteUrl;
}

function toAbsoluteAssetUrl(url?: string | null) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url)) {
      return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, 'https://fitnessarts.com');
    }
    return url;
  }
  return `${getAbsoluteSiteUrl()}/${url.replace(/^\/+/, '')}`;
}

export async function sendSubscriberLoginEmail({
  userEmail,
  userName,
  temporaryPassword,
}: {
  userEmail: string;
  userName: string;
  temporaryPassword: string;
}) {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ['emailSenderName', 'emailLogoUrl', 'emailPrimaryColor'],
      },
    },
  });

  const settingsMap = settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value || '';
    return acc;
  }, {} as Record<string, string>);

  const senderName = settingsMap.emailSenderName || 'Fitness Arts';
  const logoUrl = toAbsoluteAssetUrl(settingsMap.emailLogoUrl);
  const primaryColor = settingsMap.emailPrimaryColor || '#5e3fde';
  const siteUrl = getAbsoluteSiteUrl();
  const loginUrl = `${siteUrl}/login`;
  const safeName = escapeHtml(userName || 'there');
  const safeEmail = escapeHtml(userEmail);
  const safePassword = escapeHtml(temporaryPassword);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
      ${logoUrl ? `<div style="text-align: center; padding: 20px; background: #fff; border-bottom: 1px solid #eaeaea;"><img src="${logoUrl}" alt="Logo" style="max-height: 60px; max-width: 100%;" /></div>` : ''}
      <div style="background-color: ${primaryColor}; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Your Fitness Arts account is ready</h1>
      </div>
      <div style="padding: 32px; color: #333;">
        <p style="font-size: 16px; margin-top: 0;">Hello ${safeName},</p>
        <p style="font-size: 16px; line-height: 1.5;">Your account has been created. You can use the details below to sign in.</p>
        <div style="background-color: #f6f7f7; padding: 16px; border-radius: 6px; margin: 24px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${safeEmail}</p>
          <p style="margin: 0;"><strong>Temporary Password:</strong> ${safePassword}</p>
        </div>
        <p style="font-size: 16px; line-height: 1.5;">Login here:</p>
        <p style="margin: 24px 0;">
          <a href="${loginUrl}" style="display: inline-block; background: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: bold;">Login to Your Account</a>
        </p>
        <p style="font-size: 14px; color: #666; line-height: 1.5;">For security, please change your password after logging in.</p>
        <p style="font-size: 16px; color: #333; margin-top: 32px;">
          Thank you,<br>
          <span style="color: #666;">- ${escapeHtml(senderName)}</span>
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: `${userEmail}__FROM_NAME__${senderName}`,
    subject: 'Your Fitness Arts login details',
    html,
  });
}


export async function sendManualCourseAccessEmail({
  userEmail,
  userName,
  courseTitle,
  courseSlug,
  planName,
  expiresAt,
}: {
  userEmail: string;
  userName: string;
  courseTitle: string;
  courseSlug?: string | null;
  planName?: string | null;
  expiresAt?: string | null;
}) {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ['emailSenderName', 'emailLogoUrl', 'emailPrimaryColor'],
      },
    },
  });

  const settingsMap = settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value || '';
    return acc;
  }, {} as Record<string, string>);

  const senderName = settingsMap.emailSenderName || 'Fitness Arts';
  const logoUrl = toAbsoluteAssetUrl(settingsMap.emailLogoUrl);
  const primaryColor = settingsMap.emailPrimaryColor || '#5e3fde';
  const siteUrl = getAbsoluteSiteUrl();
  const loginUrl = `${siteUrl}/login`;
  const courseUrl = courseSlug ? `${siteUrl}/courses/${courseSlug}` : siteUrl;
  const safeName = escapeHtml(userName || 'there');
  const safeCourseTitle = escapeHtml(courseTitle || 'your course');
  const safePlanName = escapeHtml(planName || 'Course Access');
  const expiryText = expiresAt ? new Date(expiresAt).toLocaleDateString() : 'Lifetime';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
      ${logoUrl ? `<div style="text-align: center; padding: 20px; background: #fff; border-bottom: 1px solid #eaeaea;"><img src="${logoUrl}" alt="Logo" style="max-height: 60px; max-width: 100%;" /></div>` : ''}
      <div style="background-color: ${primaryColor}; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Your course access is active</h1>
      </div>
      <div style="padding: 32px; color: #333;">
        <p style="font-size: 16px; margin-top: 0;">Hello ${safeName},</p>
        <p style="font-size: 16px; line-height: 1.5;">Your access has been activated. You can now log in and view your on-demand class videos.</p>

        <div style="background-color: #f6f7f7; padding: 16px; border-radius: 6px; margin: 24px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Course:</strong> ${safeCourseTitle}</p>
          <p style="margin: 0 0 8px 0;"><strong>Access Plan:</strong> ${safePlanName}</p>
          <p style="margin: 0;"><strong>Access Expires:</strong> ${escapeHtml(expiryText)}</p>
        </div>

        <p style="margin: 24px 0;">
          <a href="${courseUrl}" style="display: inline-block; background: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: bold;">View Course</a>
        </p>

        <p style="font-size: 14px; color: #666; line-height: 1.5;">
          You can also sign in here: <a href="${loginUrl}" style="color: ${primaryColor};">${loginUrl}</a>
        </p>

        <p style="font-size: 14px; color: #666; line-height: 1.5; margin-top: 18px;">
          If you do not remember your password, please contact the site administrator for help resetting it.
        </p>

        <p style="font-size: 16px; color: #333; margin-top: 32px;">
          Thank you,<br>
          <span style="color: #666;">- ${escapeHtml(senderName)}</span>
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: `${userEmail}__FROM_NAME__${senderName}`,
    subject: `Your access to ${courseTitle} is active`,
    html,
  });
}


export async function sendCourseSubscriptionRenewalEmail({
  userEmail,
  userName,
  courseName,
  planName,
  amount,
  orderNumber,
  accessUntil,
}: {
  userEmail: string;
  userName: string;
  courseName: string;
  planName: string;
  amount: string;
  orderNumber: string;
  accessUntil?: Date | string | null;
}) {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ['emailSenderName', 'emailLogoUrl', 'emailPrimaryColor', 'adminEmail'],
      },
    },
  });

  const settingsMap = settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value || '';
    return acc;
  }, {} as Record<string, string>);

  const senderName = settingsMap.emailSenderName || 'Fitness Arts';
  const logoUrl = toAbsoluteAssetUrl(settingsMap.emailLogoUrl);
  const primaryColor = settingsMap.emailPrimaryColor || '#5e3fde';
  const safeName = escapeHtml(userName || 'there');
  const safeCourseName = escapeHtml(courseName || 'your course');
  const safePlanName = escapeHtml(planName || 'Course Access');
  const safeOrderNumber = escapeHtml(orderNumber);
  const safeAmount = escapeHtml(amount);
  const accessDate = accessUntil ? new Date(accessUntil).toLocaleDateString() : 'your next billing period';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
      ${logoUrl ? `<div style="text-align: center; padding: 20px; background: #fff; border-bottom: 1px solid #eaeaea;"><img src="${logoUrl}" alt="Logo" style="max-height: 60px; max-width: 100%;" /></div>` : ''}
      <div style="background-color: ${primaryColor}; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Your subscription has been renewed</h1>
      </div>
      <div style="padding: 32px; color: #333;">
        <p style="font-size: 16px; margin-top: 0;">Hello ${safeName},</p>
        <p style="font-size: 16px; line-height: 1.5;">Your auto-renewal payment was successful. Your course access has been extended.</p>

        <div style="background-color: #f6f7f7; padding: 16px; border-radius: 6px; margin: 24px 0;">
          <h3 style="margin-top: 0; color: #111;">Renewal Details</h3>
          <p style="margin: 0 0 8px 0; color: #555;"><strong>Order Number:</strong> ${safeOrderNumber}</p>
          <p style="margin: 0 0 8px 0; color: #555;"><strong>Course:</strong> ${safeCourseName}</p>
          <p style="margin: 0 0 8px 0; color: #555;"><strong>Plan:</strong> ${safePlanName}</p>
          <p style="margin: 0 0 8px 0; color: #555;"><strong>Amount Paid:</strong> $${safeAmount}</p>
          <p style="margin: 0; color: #555;"><strong>Access Extended Until:</strong> ${escapeHtml(accessDate)}</p>
        </div>

        <p style="font-size: 16px; color: #333; margin-top: 32px;">
          Thank you,<br>
          <span style="color: #666;">- ${escapeHtml(senderName)}</span>
        </p>
      </div>
    </div>
  `;

  const result = await sendEmail({
    to: `${userEmail}__FROM_NAME__${senderName}`,
    subject: `Your ${courseName} subscription has been renewed`,
    html,
  });

  try {
    const adminEmail = settingsMap.adminEmail;
    if (adminEmail) {
      const adminHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
          ${logoUrl ? `<div style="text-align: center; padding: 20px; background: #fff; border-bottom: 1px solid #eaeaea;"><img src="${logoUrl}" alt="Logo" style="max-height: 60px; max-width: 100%;" /></div>` : ''}
          <div style="background-color: ${primaryColor}; padding: 24px; text-align: center;"><h2 style="margin: 0; color: white;">Subscription Renewal Payment</h2></div>
          <div style="padding: 32px; color: #333;">
            <p><strong>${safeName}</strong> renewed access for <strong>${safeCourseName}</strong>.</p>
            <p><strong>Order:</strong> ${safeOrderNumber}</p>
            <p><strong>Amount:</strong> $${safeAmount}</p>
            <p><strong>Access Until:</strong> ${escapeHtml(accessDate)}</p>
          </div>
        </div>
      `;
      await sendEmail({
        to: `${adminEmail}__FROM_NAME__${senderName}`,
        subject: `Subscription Renewal: ${safeOrderNumber}`,
        html: adminHtml,
      });
    }
  } catch (err) {
    console.error('Failed to send admin renewal email', err);
  }

  return result;
}


export async function sendCourseAccessRenewalReminderEmail({
  userEmail,
  userName,
  courseName,
  courseSlug,
  planName,
  expiresAt,
}: {
  userEmail: string;
  userName: string;
  courseName: string;
  courseSlug: string;
  planName: string;
  expiresAt: Date | string | null;
}) {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ['emailSenderName', 'emailLogoUrl', 'emailPrimaryColor'],
      },
    },
  });

  const settingsMap = settings.reduce((acc, curr) => {
    acc[curr.key] = curr.value || '';
    return acc;
  }, {} as Record<string, string>);

  const senderName = settingsMap.emailSenderName || 'Fitness Arts';
  const logoUrl = toAbsoluteAssetUrl(settingsMap.emailLogoUrl);
  const primaryColor = settingsMap.emailPrimaryColor || '#5e3fde';
  const siteUrl = getAbsoluteSiteUrl();
  const loginUrl = `${siteUrl}/login`;
  const courseUrl = `${siteUrl}/courses/${courseSlug}`;
  const safeName = escapeHtml(userName || 'there');
  const safeCourseName = escapeHtml(courseName || 'your course');
  const safePlanName = escapeHtml(planName || 'Course Access');
  const expiryDate = expiresAt ? new Date(expiresAt).toLocaleDateString() : 'soon';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
      ${logoUrl ? `<div style="text-align: center; padding: 20px; background: #fff; border-bottom: 1px solid #eaeaea;"><img src="${logoUrl}" alt="Logo" style="max-height: 60px; max-width: 100%;" /></div>` : ''}
      <div style="background-color: ${primaryColor}; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Your access is expiring soon</h1>
      </div>
      <div style="padding: 32px; color: #333;">
        <p style="font-size: 16px; margin-top: 0;">Hello ${safeName},</p>
        <p style="font-size: 16px; line-height: 1.5;">
          This is a reminder that your on-demand class access will expire in 15 days.
        </p>

        <div style="background-color: #f6f7f7; padding: 16px; border-radius: 6px; margin: 24px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Course:</strong> ${safeCourseName}</p>
          <p style="margin: 0 0 8px 0;"><strong>Access Plan:</strong> ${safePlanName}</p>
          <p style="margin: 0;"><strong>Access Expires:</strong> ${escapeHtml(expiryDate)}</p>
        </div>

        <p style="margin: 24px 0;">
          <a href="${courseUrl}" style="display: inline-block; background: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: bold;">
            Renew / View Plans
          </a>
        </p>

        <p style="font-size: 14px; color: #666; line-height: 1.5;">
          You can also sign in here: <a href="${loginUrl}" style="color: ${primaryColor};">${loginUrl}</a>
        </p>

        <p style="font-size: 16px; color: #333; margin-top: 32px;">
          Thank you,<br>
          <span style="color: #666;">- ${escapeHtml(senderName)}</span>
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: `${userEmail}__FROM_NAME__${senderName}`,
    subject: `Your ${courseName} access expires soon`,
    html,
  });
}
