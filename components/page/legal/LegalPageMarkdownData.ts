export const TERMS_OF_SERVICE = `
## 1. Introduction
Welcome to ShortReal AI. By accessing or using our website and services, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, you must not use our services.

## 2. Use of Services
You agree to use our services only for lawful purposes. You represent and warrant that you will not use the service to:
- Generate deepfakes, sexually explicit content, or hate speech.
- Infringe upon the intellectual property or privacy rights of others.
- Reverse engineer, scrape, or exploit our API and resources.

## 3. Intellectual Property
**Your Content:** You retain ownership of the videos you create. You represent that you have the necessary rights to the input media you provide.
**Our Rights:** You grant us a non-exclusive, worldwide license to use your generated content solely for the purpose of operating, improving, and debugging our services.

## 4. Payment & No Refunds
**All Sales Are Final:** Due to the resource-intensive nature of AI video generation, **we strictly do not offer refunds** once credits have been used or a subscription period has started.
**Why No Refunds?** Our service relies on expensive upstream GPU providers (e.g., [Replicate](https://replicate.com/), [fal.ai](https://fal.ai)) that charge us immediately upon your generation request.
**Since our providers do not refund us for this compute time, we cannot refund you.**
**Waiver:** By using the service, you acknowledge that the service execution begins immediately and explicitly waive your right of withdrawal once the generation process has started.
**Cancellation:** You may cancel your subscription at any time. Access continues until the end of the billing cycle.

## 5. Disclaimer of Warranties
The service is provided "AS IS" without warranties of any kind. We do not guarantee that AI-generated content will be accurate, unique, or suitable for your specific needs.

## 6. Limitation of Liability & Indemnification
**Limitation:** To the maximum extent permitted by law, ShortReal AI shall not be liable for any indirect, incidental, or consequential damages (including loss of data or profits).
**Indemnification:** You agree to indemnify and hold harmless ShortReal AI and its operators from any claims, damages, or legal fees arising from **your use of the generated content** or your violation of these Terms.

## 7. Termination
We reserve the right to **suspend or terminate your account and access** to the service immediately, without prior notice or liability, **for any reason whatsoever**, including without limitation if you breach the Terms.
Upon termination, your right to use the service will immediately cease. **If your account is terminated due to a violation of these Terms, you will not be entitled to any refund of unused credits or subscription fees.**

## 8. Modifications to Service
We reserve the right to modify, suspend, or discontinue the service (or any part thereof) at any time with or without notice. We shall not be liable to you or to any third party for any modification, suspension, or discontinuance of the service.

## 9. Force Majeure
We shall not be held responsible for any delay or failure in performance caused by events beyond our reasonable control, including but not limited to acts of God, war, strikes, or **infrastructure and upstream API outages (for example, [Cloudflare](https://www.cloudflare.com/) system down, [Replicate](https://replicate.com/) or [fal.ai](https://fal.ai) downtime, or scheduled and unscheduled maintenance by third-party vendors)**

## 10. Governing Law & Jurisdiction
These Terms are governed by the laws of the Republic of Korea. Any disputes arising out of or in connection with these Terms shall be subject to the **exclusive jurisdiction of the Seoul Central District Court**.
`;

export const PRIVACY_POLICY = `
## 1. Introduction
ShortReal AI ("we", "us", or "our") respects your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website.

## 2. Information We Collect
- **Account Data:** Email address, name, and profile picture (via OAuth providers).
- **Usage Data:** Prompts, generated video metadata, and interaction logs. Technical data such as IP address and browser type is automatically collected by our infrastructure providers (e.g., Vercel, Cloudflare) for security and analytics purposes.
- **Payment Data:** We do not store credit card details. All financial transactions are processed by our secure payment provider, Polar (or Stripe).

## 3. How We Use Your Information
- To provide, operate, and maintain our AI video generation services.
- To improve, personalize, and expand our website.
- To detect and prevent fraud or abuse (e.g., NSFW content filtering).
- To communicate with you regarding updates, support, and invoices.

## 4. Data Sharing & Third Parties
We may share your data with the following third-party vendors to facilitate our services:
- **AI Models:** [DeepSeek](https://www.deepseek.com/en/), [Replicate](https://replicate.com/), [fal.ai](https://fal.ai) (for content generation)
- **Infrastructure:** [Vercel](https://vercel.com/home), [Cloudflare](https://www.cloudflare.com/), [Supabase](https://supabase.com/) (for hosting and database)
- **Analytics:** [Vercel](https://vercel.com/home), [Cloudflare](https://www.cloudflare.com/) (for usage analysis)
- **Payments:** [Polar](https://polar.sh/), [Stripe](https://stripe.com/) (for processing payments)

## 5. Cookies and Tracking Technologies
We use cookies and similar tracking technologies to track the activity on our service and hold certain information. You can instruct your browser to refuse all cookies, but some parts of our service may not function properly without them.

## 6. Data Security
We implement industry-standard security measures (SSL encryption, secure databases) to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.

## 7. User Rights (GDPR & CCPA)
Depending on your location, you may have the following rights:
- **Right to Access:** You have the right to request copies of your personal data.
- **Right to Rectification:** You can request that we correct any information you believe is inaccurate.
- **Right to Deletion:** You can request that we delete your personal data ("Right to be Forgotten").
To exercise these rights, please contact us at [support email].

## 8. Children's Privacy
Our service is not intended for use by children under the age of 13. We do not knowingly collect personal information from children. If we discover that a child under 13 has provided us with personal information, we will delete it immediately.

## 9. Changes to This Privacy Policy
We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.

## 10. Contact Us
If you have any questions about this Privacy Policy or wish to exercise your user rights, please contact us at:
- **Email:** support@shortreal.ai
`;