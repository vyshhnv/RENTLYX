# RentlyX Go-Live Checklist

## Must Fix Before Public Onboarding

1. Set real backend secrets in [server/project1/.env.example](C:\Users\NITRO\Desktop\RentlyX\server\project1\.env.example) copied to `server/project1/.env`.
2. Set real frontend API URLs in [client/project1/.env.example](C:\Users\NITRO\Desktop\RentlyX\client\project1\.env.example) copied to `client/project1/.env`.
3. Add live Razorpay keys and test a full payment from create order to verify payment to seller action.
4. Add real email SMTP credentials and verify OTP, forgot-password, and booking emails.
5. Add real Twilio credentials and verify SMS or phone OTP flows if you want them enabled.
6. Install full OCR support for tax verification:
   `pytesseract`
   Pillow
   Windows Tesseract binary
7. Replace the current default Django secret key with a strong production secret.
8. Set `ALLOWED_HOSTS`, `APP_BASE_URL`, and `CORS_ALLOWED_ORIGINS` to your real domain names.
9. Run the app behind HTTPS and keep secure cookie settings enabled in production.
10. Back up your production database before onboarding real users.

## Strongly Recommended Before Launch

1. Click through the full user flow in a browser:
   register
   login
   property search
   property detail
   booking
   review
2. Click through the full seller flow:
   seller login
   PAN verify
   add property
   messages
   booking accept or reject
3. Click through the full admin flow:
   admin login
   approve property
   review complaints
   moderate reviews
4. Reduce the frontend bundle size by lazy-loading heavy pages.
5. Add more backend tests for auth, seller onboarding, admin approvals, and chat.
6. Decide whether you still need a separate AI service endpoint or only Django AI endpoints.

## Already Verified Locally

1. Frontend lint passes.
2. Frontend production build passes.
3. Django system checks pass.
4. Django tests pass.
5. Live API smoke tests pass.
6. Ollama-backed AI chat works.
7. AI price prediction works.

## Launch Verdict

Demo-ready: yes  
Internal testing-ready: yes  
Public onboarding-ready: almost, but only after payments, email/SMS, OCR, and full browser flow checks are completed.
