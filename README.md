# Brightland Property Management SystemThis is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).



A comprehensive property management platform built with Next.js 15, MongoDB, Stripe, and NextAuth.## Getting Started



## 🚀 Quick StartFirst, run the development server:



### Prerequisites```bash

- Node.js 18+ npm run dev

- MongoDB Atlas account# or

- Stripe accountyarn dev

- Google OAuth credentials# or

- Resend API keypnpm dev

# or

### Installationbun dev

```

```bash

# Clone the repositoryOpen [http://localhost:3000](http://localhost:3000) with your browser to see the result.

git clone https://github.com/teamvcorp/brightland.git

cd brightlandYou can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.



# Install dependenciesThis project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

npm install

## Learn More

# Set up environment variables

cp .env.example .env.localTo learn more about Next.js, take a look at the following resources:

# Edit .env.local with your credentials

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.

# Run development server- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

npm run dev

```You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!



Visit `http://localhost:3000`## Deploy on Vercel



### Environment SetupThe easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.



Create `.env.local` with these variables:Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.


```bash
MONGODB_URI=mongodb+srv://...mongodb.net/brightland-dev
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
ADMIN_EMAILS=admin@example.com
```

### Stripe Webhook Testing

```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local server
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

---

## 🏗️ Tech Stack

- **Framework:** Next.js 15.4.3 (App Router)
- **Database:** MongoDB Atlas
- **Authentication:** NextAuth.js (Google OAuth + Credentials)
- **Payments:** Stripe (ACH + Cards)
- **Email:** Resend API
- **Styling:** Tailwind CSS
- **Language:** TypeScript

---

## 📋 Features

### For Tenants
✅ Browse available rental properties  
✅ Submit rental applications online  
✅ Google OAuth or email/password signup  
✅ Identity verification via Stripe  
✅ Set up automatic rent payments (ACH + backup card)  
✅ Pay security deposits  
✅ View payment history  
✅ Submit maintenance/manager requests  
✅ Track request status with conversation history  

### For Property Owners
✅ Manage multiple properties  
✅ View tenant applications  
✅ No Stripe account needed (business model)  
✅ Dashboard for property overview  

### For Managers
✅ View and respond to tenant requests  
✅ Conversation tracking  
✅ Status updates (pending → in-progress → resolved)  

### For Admins
✅ Approve/deny rental applications  
✅ Promote users to manager role  
✅ Enable automatic rent payments  
✅ View all system activity  
✅ Soft delete with recovery options  

---

## 🔐 User Roles

| Role | Description | Stripe Customer |
|------|-------------|-----------------|
| **Tenant** | Renters, pay monthly rent | ✅ Yes |
| **Property Owner** | Own/manage properties | ❌ No (Business) |
| **Manager** | Handle tenant requests | ❌ No |
| **Admin** | Full system access | ❌ No |

---

## 💳 Payment System

### Payment Hierarchy
1. **Primary: Bank Account (ACH)** - Required for all tenants
2. **Backup: Credit Card** - Optional, used if ACH fails

### Payment Flow
1. Tenant applies for property → $50 application fee
2. Application approved → Setup payment methods
3. Add bank account (required)
4. Pay security deposit (required)
5. Add credit card (optional backup)
6. Admin enables auto-pay
7. Monthly rent charged automatically via Stripe subscription

### Supported Payment Types
- Monthly rent (recurring)
- Security deposits (one-time)
- Application fees (one-time)
- Late fees
- Maintenance fees

---

## 🎫 Manager Request System

### Features
- Soft delete (preserves data, allows recovery)
- Conversation threading
- Email notifications
- Status tracking
- Admin recovery tools

### Request Lifecycle
```
Tenant submits → Manager notified → 
Manager responds → Conversation logged → 
Status updates → Resolved or Deleted
```

---

## 📁 Project Structure

```
brightland/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # NextAuth handlers
│   │   ├── stripe/       # Stripe integration
│   │   ├── admin/        # Admin endpoints
│   │   ├── tenant/       # Tenant endpoints
│   │   └── resend/       # Email endpoints
│   ├── components/       # React components
│   ├── dashboard/        # Tenant dashboard
│   ├── admin/           # Admin panel
│   ├── manager-dashboard/ # Manager interface
│   ├── onboarding/      # OAuth onboarding
│   ├── setup-payments/  # Payment setup flow
│   └── ...              # Other pages
├── lib/                 # Utilities
│   └── mongodb.ts       # Database connection
├── models/              # Mongoose schemas
│   ├── User.ts
│   ├── Payment.ts
│   ├── RentalApplication.ts
│   └── ManagerRequest.ts
├── public/              # Static assets
└── types/               # TypeScript types
```

---

## 🗄️ Database Schema

### Collections
- **users** - User accounts and profiles
- **rentalapplications** - Rental applications
- **managerrequests** - Maintenance/support requests
- **payments** - Payment transactions
- **propertyowners** - Property owner organizations

See `SYSTEM_DOCUMENTATION.md` for detailed schemas.

---

## 🔧 Development

### Build for Production
```bash
npm run build
```

### Run Production Build
```bash
npm start
```

### Code Quality
```bash
npm run lint
```

---

## 🚢 Deployment

### Recommended: Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables
Set all variables from `.env.local` in Vercel dashboard.

### Post-Deployment
1. Update `NEXTAUTH_URL` to production domain
2. Add production domain to Google OAuth allowed origins
3. Update Stripe webhook URL
4. Configure DNS settings

---

## 📚 Documentation

- **`SYSTEM_DOCUMENTATION.md`** - Complete system architecture and API reference
- **`README.md`** - This file (project overview)

### Historical Docs (Archived)
All implementation guides and fix logs have been consolidated. For historical reference, check git history.

---

## 🔒 Security

- Environment variables never committed
- Stripe webhook signature verification
- NextAuth CSRF protection
- MongoDB connection encryption
- Password hashing with bcrypt
- Role-based access control

---

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Error:**
- Check `MONGODB_URI` format
- Verify IP whitelist in MongoDB Atlas
- Ensure database user has permissions

**Stripe Webhook Not Working:**
- Run `stripe listen` for local development
- Verify webhook secret matches
- Check webhook endpoint is publicly accessible (production)

**Google OAuth Error:**
- Verify redirect URIs in Google Console
- Check client ID/secret
- Ensure `NEXTAUTH_URL` is correct

**Payment Method Not Showing:**
- Check Stripe customer has payment methods attached
- Verify bank account or card is verified
- See `/api/stripe/default-payment-method` for logic

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📝 License

This project is proprietary and confidential.

---

## 📧 Support

For questions or issues, contact the development team.

---

**Built with ❤️ by the Brightland Team**
