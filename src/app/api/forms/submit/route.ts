import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSmtpTransport, getSmtpSettings } from '@/lib/smtp';

export async function POST(req: Request) {
  try {
    const { formId, data, recaptchaToken, honeypot, pageUrl } = await req.json();
    
    if (!formId) return NextResponse.json({ error: 'Missing formId' }, { status: 400 });

    const form = await prisma.form.findUnique({ where: { id: parseInt(formId) } });
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

    const settings = form.settings ? JSON.parse(form.settings) : {};

    // Spam protection is configured globally under Forms > Settings.
    const spamRows = await prisma.setting.findMany({
      where: { key: { in: [
        'forms_honeypot_enabled',
        'forms_recaptcha_v3_enabled',
        'forms_recaptcha_secret_key',
        'forms_recaptcha_score_threshold'
      ] } }
    });
    const spam = spamRows.reduce((acc: Record<string, string>, row) => {
      acc[row.key] = row.value || '';
      return acc;
    }, {});

    const honeypotEnabled = spam.forms_honeypot_enabled !== 'false';
    if (honeypotEnabled && String(honeypot || '').trim()) {
      // Return a normal success response so bots do not learn which trap caught them.
      return NextResponse.json({ success: true, message: settings.successMessage || 'Thank you for your submission!' });
    }

    const recaptchaEnabled = spam.forms_recaptcha_v3_enabled === 'true';
    if (recaptchaEnabled) {
      const secretKey = spam.forms_recaptcha_secret_key || '';
      if (!secretKey) return NextResponse.json({ error: 'reCAPTCHA is enabled but not configured.' }, { status: 500 });
      if (!recaptchaToken) return NextResponse.json({ error: 'reCAPTCHA token missing' }, { status: 400 });

      const verifyBody = new URLSearchParams({ secret: secretKey, response: recaptchaToken });
      const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: verifyBody.toString()
      });
      const verifyData = await verifyRes.json();
      const threshold = Math.min(1, Math.max(0, Number(spam.forms_recaptcha_score_threshold || '0.5') || 0.5));

      if (!verifyData.success || Number(verifyData.score || 0) < threshold) {
        return NextResponse.json({ error: 'Spam detected by reCAPTCHA.' }, { status: 400 });
      }
    }

    const submission = await prisma.formSubmission.create({
      data: {
        formId: parseInt(formId),
        data: JSON.stringify(data)
      }
    });

    // Handle Notifications
    const notifications = settings.notifications || [];
    // Fallback if no notifications array exists but old notificationEmail is present
    if (notifications.length === 0 && form.notificationEmail) {
      notifications.push({
        name: 'Admin Notification',
        to: form.notificationEmail,
        subject: `New submission: ${form.title}`,
        message: '{all_fields}'
      });
    }

    if (notifications.length > 0) {
      // Provider-independent SMTP configuration. Supports Gmail, hosting SMTP,
      // Outlook/Office 365, Zoho, Mailgun/SendGrid SMTP relays, and custom servers.
      const smtp = await getSmtpSettings();
      const defaultFrom = smtp.fromEmail || smtp.user || 'noreply@example.com';
      const siteTitleSetting = await prisma.setting.findUnique({ where: { key: 'site_title' } });
      const siteName = siteTitleSetting?.value || 'Website';

      if (smtp.enabled && smtp.host && (smtp.authMode === 'none' || (smtp.user && smtp.pass))) {
        const transporter = createSmtpTransport(smtp);
        let fields: any[] = [];
        try { fields = JSON.parse(form.fields || '[]'); } catch(e) {}

        // Helper to replace merge tags
        const resolveMergeTags = (text: string) => {
          if (!text) return '';
          let resolved = text;
          resolved = resolved.replace(/{site_name}/g, siteName);
          resolved = resolved.replace(/{admin_email}/g, defaultFrom);
          resolved = resolved.replace(/{embed_url}/g, pageUrl || '');
          
          // Replace {field_label} with actual data
          fields.forEach(f => {
            const val = Array.isArray(data[f.id]) ? data[f.id].join(', ') : (data[f.id] || '');
            const regex = new RegExp(`{${f.label}}`, 'gi');
            resolved = resolved.replace(regex, val);
            // Also support {email} standard fallback if a field is named Email
            if (f.label.toLowerCase() === 'email') {
              resolved = resolved.replace(/{email}/gi, val);
            }
          });

          // Process {all_fields}
          if (resolved.includes('{all_fields}')) {
            let htmlContent = `<table border="1" cellpadding="10" cellspacing="0" style="width:100%; border-collapse: collapse; font-family: sans-serif; font-size: 14px; border-color: #e5e7eb;">`;
            for (const key in data) {
              const field = fields.find((f: any) => f.id === key);
              
              // Explicitly extract the label and ensure it never renders completely blank.
              // If the user checked "Hide Label" but provided text, it will properly use that text.
              let labelText = key;
              if (field && typeof field.label === 'string' && field.label.trim() !== '') {
                labelText = field.label.trim();
              }
              
              let val = Array.isArray(data[key]) ? data[key].join(', ') : data[key];
              
              htmlContent += `<tr><td style="background-color: #f1f5f9; font-weight: 700; color: #333; border-bottom: none;">${labelText}</td></tr>`;
              htmlContent += `<tr><td style="background-color: #ffffff; padding-left: 20px; color: #555;">${val || ''}</td></tr>`;
            }
            htmlContent += `</table>`;
            resolved = resolved.replace(/{all_fields}/g, htmlContent);
          }
          
          return resolved;
        };

        for (const notif of notifications) {
          const toAddress = resolveMergeTags(notif.to);
          if (!toAddress) continue; // Skip if no valid recipient

          const fromName = notif.fromName ? resolveMergeTags(notif.fromName) : form.title;
          const fromEmail = notif.fromEmail ? resolveMergeTags(notif.fromEmail) : defaultFrom;
          const subject = resolveMergeTags(notif.subject || `New submission: ${form.title}`);
          const messageHtml = resolveMergeTags(notif.message || '{all_fields}');
          const replyTo = notif.replyTo ? resolveMergeTags(notif.replyTo) : undefined;
          const bcc = notif.bcc ? resolveMergeTags(notif.bcc) : undefined;

          // Convert newline to <br> if it's not starting with an HTML tag
          let finalHtml = messageHtml;
          if (!finalHtml.startsWith('<')) {
            finalHtml = finalHtml.replace(/\n/g, '<br/>');
          }

          try {
            await transporter.sendMail({
              from: `"${fromName}" <${fromEmail}>`,
              to: toAddress,
              replyTo: replyTo,
              bcc: bcc,
              subject: subject,
              html: finalHtml
            });
          } catch (err) {
            console.error(`Failed to send email notification [${notif.name}]`, err);
          }
        }
      }
    }

    // Determine final success response payload
    return NextResponse.json({ success: true, message: settings.successMessage || 'Thank you for your submission!' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit form' }, { status: 500 });
  }
}
