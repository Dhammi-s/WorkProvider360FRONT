/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/** Help Center content: every feature of the app, grouped by topic. Help videos attach to these topics. */

export interface HelpFaq {
  topic: string;
  q: string;
  a: string;
}

export const HELP_TOPICS = [
  'Getting started',
  'Roles & access',
  'Team',
  'Applications',
  'Offices',
  'Clients',
  'Client portal',
  'Skills & services',
  'Payers',
  'Scheduler',
  'Time tracking & visits',
  'Approvals',
  'Billing & invoices',
  'Accounting & payroll',
  'Point of sale',
  'Meetings',
  'Announcements & notifications',
  'Reports & live map',
  'Training portal',
  'AI Analysis & assistant',
  'Security & logs',
  'Settings',
  'My profile & shortcuts',
  'Help & support',
] as const;

export const HELP_FAQS: HelpFaq[] = [
  // ---------------------------------------------------------------- Getting started
  { topic: 'Getting started', q: 'What is WorkProvider360?', a: 'WorkProvider360 manages a home-care / field-service agency: clients and their payers, the team and their skills, scheduling and time tracking, visit approval, client invoicing and payroll, meetings, a client portal, reports, a live GPS map and AI analysis. Each agency has its own separate data and users.' },
  { topic: 'Getting started', q: 'How do I sign in?', a: 'Use the email and password your administrator gave you on the sign-in screen. If you forgot your password, click “Forgot password?” to receive a reset link by email, then set a new password from the link. Clients use the separate client sign-in page.' },
  { topic: 'Getting started', q: 'How do I find my way around?', a: 'The sidebar lists every page you have access to (it depends on your role and the permissions your Super Admin set). Collapse it to icons with the toggle in the top bar. The Overview page shows a summary of your agency or your own work, and the bell in the top bar shows your notifications.' },
  { topic: 'Getting started', q: 'I can’t reach the app / I’m offline', a: 'If you lose internet, the app shows a “No internet connection” screen and reconnects automatically once you are back online.' },

  // ---------------------------------------------------------------- Roles & access
  { topic: 'Roles & access', q: 'What are the roles?', a: 'Super Admin controls the whole workspace and all settings. Admin runs operations for their office and outranks Managers. Manager runs their team’s jobs and schedules Users. User (team member / caregiver) sees only their own work: accepting shifts, clocking in and out, notes and injury reports. Client is a portal-only role for the people the agency serves.' },
  { topic: 'Roles & access', q: 'Why can’t I see a page or a button?', a: 'Access is set per role. In Settings → Roles & Permissions and the Scheduling, Clients & Visits, Meetings, Log Access, Announcements and AI Analysis tabs, the Super Admin gives Admins and Managers None, Read or Write access. Read lets you view; Write lets you add and change. Admins and Managers also see only their own office’s data.' },
  { topic: 'Roles & access', q: 'Who can schedule whom?', a: 'You can only schedule people ranked below you: Super Admin schedules anyone, Admin schedules Managers and Users, and Managers schedule Users.' },

  // ---------------------------------------------------------------- Team
  { topic: 'Team', q: 'How do I add a team member?', a: 'Open Team and click “Add team member”. Enter the full name, email, a temporary password, role, phone and office. The member receives their login details by email. Admins can only add people to their own office.' },
  { topic: 'Team', q: 'How do I resend login details or unlock an account?', a: 'In Team, use “Resend” on a member’s row (it resets the password and emails new credentials), or select several members and use “Resend credentials” for all of them. A member locked out after too many failed sign-ins can be unlocked from their profile.' },
  { topic: 'Team', q: 'What is on a team member’s profile?', a: 'Open a member from Team to see their details, profile information (address, qualifications, experience, emergency contact, hire date), skills (the services they can provide), weekly availability and their schedule, where you can add shifts for them directly.' },
  { topic: 'Team', q: 'How do I filter or message the team?', a: 'Filter the Team list by office and role; it is paginated. Each row can send the member an SMS (when SMS is configured).' },

  // ---------------------------------------------------------------- Applications
  { topic: 'Applications', q: 'How do people apply to join?', a: 'Share the public Apply page. Applicants fill in their details, requested role, qualifications, experience, skills, availability, expected salary and any custom questions set in Settings → Application Form.' },
  { topic: 'Applications', q: 'How are applications approved?', a: 'Open Applications, review the applicant and click Approve or Reject. Approving creates the account and emails a temporary password; rejecting emails a notice with the reason. Applications can be exported to PDF.' },

  // ---------------------------------------------------------------- Offices
  { topic: 'Offices', q: 'How do offices work?', a: 'Offices group staff and clients (Offices page). Each office has an address, phone and timezone. Super Admins manage all offices; Admins and Managers work within their own office, and the people and clients they add are placed in it automatically.' },

  // ---------------------------------------------------------------- Clients
  { topic: 'Clients', q: 'How do I add a client?', a: 'Open Clients and click “Add client”. Fill in identity (name, gender, preferred language, date of birth), contact details, address, emergency contact, care and access information (access instructions, allergies, mobility and care notes), start date, office and the services they need. Required fields follow Settings → Clients & Visits. A default payer is created for every new client.' },
  { topic: 'Clients', q: 'How do I find and update clients?', a: 'Search and filter the Clients list by status (Active, On hold, Inactive) and service, then click View. On the client page you can edit details, change status and manage their schedule, care logs, payers and billing.' },
  { topic: 'Clients', q: 'What are the tabs on a client’s page?', a: 'Main (details and portal access), Schedule (calendar with “+ Add shift”), Care Logs (each visit’s clock-in/out, notes and signature), Payers (who pays and how) and Billing & Invoice (the client’s rates and invoices).' },
  { topic: 'Clients', q: 'Which caregivers can be assigned to a client?', a: 'When scheduling, the caregiver list shows each person’s office and skills. Settings → Clients & Visits can require the caregiver to be in the client’s office and/or to have the requested skill; caregivers who don’t match are labelled.' },

  // ---------------------------------------------------------------- Client portal
  { topic: 'Client portal', q: 'How do I give a client portal access?', a: 'Open the client’s Main tab and use the Portal access card: “Enable portal & email login” creates the login and emails it to the client and their active payers. “Resend credentials” emails a new temporary password, and “Disable” turns access off. The client needs an email address.' },
  { topic: 'Client portal', q: 'It says “The client portal is disabled for this agency”', a: 'A Super Admin must switch on “Client portal enabled” in Settings → Clients & Visits (and “Email credentials on enable” to send the login automatically). Then enable the client again.' },
  { topic: 'Client portal', q: 'What can clients see in the portal?', a: 'Their care summary, a calendar and list of visits with care logs, their services, their profile, and their invoices — the amount due, what is paid and a PDF download for each invoice.' },

  // ---------------------------------------------------------------- Skills & services
  { topic: 'Skills & services', q: 'What are skills & services?', a: 'Skills & Services lists the services your agency provides (for example nursing or companionship) with a category, description, colour and order. They are linked to clients (services they need), to team members (skills they have) and to shifts. Deactivate a service instead of deleting it. Who can edit them is set in Settings → Clients & Visits.' },

  // ---------------------------------------------------------------- Payers
  { topic: 'Payers', q: 'What is a payer and where do I manage payers?', a: 'A payer is whoever pays for a client’s care: insurance, Medicaid, Medicare, Veterans Affairs, a contract, a facility or a family member (private pay). Open Payers in the sidebar to search and filter by office, status and type, and click “+ Add payer” to create one as an Individual (first and last name) or a Company / facility (company name plus a contact person).' },
  { topic: 'Payers', q: 'What is on a payer’s page?', a: 'Details (type, contact details, address, notes and default bill / pay rates), Contacts (extra contact people) and Linked clients (every client the payer pays for). “Mark inactive” stops using a payer: it stays linked but is skipped for rates, new visits and invoices.' },
  { topic: 'Payers', q: 'How do I link a payer to a client?', a: 'Open the client’s Payers tab and click “+ Link payer”. Search the agency’s payers (or click “+ New payer”), then set the rank position, start and end dates, policy number, member ID, group, the subscriber (the client or someone else) and the payment distribution. One payer can be linked to many clients.' },
  { topic: 'Payers', q: 'What do rank and payment distribution mean?', a: 'Rank orders a client’s payers: 1 = Primary, 2 = Secondary… (use ▲ ▼ to reorder). Payment distribution says how each pays: Remainder (whatever is left), Split (a percentage), Per diem, Per visit, Weekly or Monthly (a fixed amount). Exactly one payer pays the Remainder; Split payers together can cover at most 100%.' },
  { topic: 'Payers', q: 'Why can’t I deactivate a payer or change it from Remainder?', a: 'A client always needs one payer for the remainder. Set another payer to Remainder first; the old one then becomes Split 0% and can be changed or deactivated.' },
  { topic: 'Payers', q: 'What does “Sync to visits” do?', a: 'Each visit keeps its own copy of the client’s payers, taken when it is created. After changing payers, “Sync to visits” applies the current payers to the client’s visits that are not invoiced yet. Invoiced visits keep the payers they were billed with.' },

  // ---------------------------------------------------------------- Scheduler
  { topic: 'Scheduler', q: 'How do I use the Scheduler?', a: 'The Scheduler shows shifts by day, week or month, coloured by team member; filter by member and move between dates. Click an empty slot (or “Add job”) to create a shift, or click a shift to see its details, notes, time entries and care log.' },
  { topic: 'Scheduler', q: 'How do I create a shift?', a: 'Choose the client (their address and service fill in), service type, caregiver, title, date and times, status (Scheduled, Approved or Cancelled), bill and pay rate per hour and overtime multiplier. Optionally email Admins / Managers. The caregiver is notified by email (and SMS when configured).' },
  { topic: 'Scheduler', q: 'What is a scheduling conflict?', a: 'Before saving, the app checks whether the caregiver already has a shift at that time and shows a “Scheduling conflict” box. Click “Ignore & save” to save anyway, or Cancel to change the time.' },
  { topic: 'Scheduler', q: 'How do team members respond to shifts?', a: 'The assigned member opens the shift and clicks Accept or Reject (with a reason). They can add notes and report an injury, which is emailed to admins and managers.' },
  { topic: 'Scheduler', q: 'Can I edit or delete a shift?', a: 'Yes, with Write access to scheduling: open the shift and use “Edit schedule” or Delete. A visit that is on a client invoice cannot be deleted — cancel it instead.' },

  // ---------------------------------------------------------------- Time tracking & visits
  { topic: 'Time tracking & visits', q: 'How do I clock in and out?', a: 'Open your shift and click Clock in, then Clock out when done. Depending on Settings → Clients & Visits, your GPS location is recorded and the client may need to sign on clock-in and / or clock-out. After one full clock-in/out the buttons lock for that shift.' },
  { topic: 'Time tracking & visits', q: 'What is auto clock-in/out?', a: 'If enabled (Settings → Scheduling, and per-visit options in Clients & Visits), the system records the scheduled hours for a shift nobody clocked in/out on once it has ended. It never interrupts a shift in progress.' },
  { topic: 'Time tracking & visits', q: 'How do I add or fix time manually?', a: 'Managers with Write access can add or edit a time entry on a shift with a note, for example when someone forgot to clock out.' },
  { topic: 'Time tracking & visits', q: 'What is a care log?', a: 'Each visit’s care log shows clock-in and clock-out times and locations, notes, injury reports and the client’s signature. Open it from the shift on the Scheduler or from the client’s Care Logs tab.' },

  // ---------------------------------------------------------------- Approvals
  { topic: 'Approvals', q: 'How do I approve a schedule?', a: 'Choose Status “Approved” when creating the shift, or open it on the Scheduler and click “Approve” (and “Remove approval” to undo). Approved shifts show a ✓ on the calendar. Cancelled or rejected shifts cannot be approved.' },
  { topic: 'Approvals', q: 'Who can approve, and why does approval matter?', a: 'Only approved visits are invoiced by default. A Super Admin can always approve; in Settings → Scheduling → Schedule approval & invoicing the Super Admin decides whether Admins and Managers can approve, and which roles may invoice unapproved visits.' },

  // ---------------------------------------------------------------- Billing & invoices
  { topic: 'Billing & invoices', q: 'How are a shift’s bill and pay rates chosen?', a: 'Each rate fills in separately from the first place that has one: the client’s own rates (Billing & Invoice tab), then the client’s payers in rank order that are active on the visit date, then the agency defaults in Settings → Scheduling. The form shows where each rate came from.' },
  { topic: 'Billing & invoices', q: 'What is a rate conflict?', a: 'If no bill or pay rate is found anywhere, the shift form shows a “Rate conflict”. Set the missing rate, or click “Ignore & save” to create the shift anyway (it bills or pays 0 until a rate is added).' },
  { topic: 'Billing & invoices', q: 'How do I invoice a client?', a: 'On the client’s Billing & Invoice tab (or Accounting → Client Invoices), choose the period and click Preview to see each uninvoiced visit with hours, rate, amount and approval, then “Create invoice”. Hours are the worked hours, or the scheduled hours if nobody clocked in. The invoice is billed to the client’s primary payer (or the client).' },
  { topic: 'Billing & invoices', q: 'Why are some visits left out of an invoice?', a: 'Only approved visits are invoiced by default. A popup explains it and offers “Approved only”, or “Invoice all” when your role may invoice unapproved visits.' },
  { topic: 'Billing & invoices', q: 'How do I download, mark paid or void an invoice?', a: 'In the invoice list use PDF to download it, “Mark paid” when payment arrives, or Void to cancel it (its visits can then be invoiced again). Clients also see their invoices in the portal.' },

  // ---------------------------------------------------------------- Accounting & payroll
  { topic: 'Accounting & payroll', q: 'What can I do in Accounting?', a: 'Super Admins pay Admins and Managers their salary (Salaries), pay Users their shift pay for a date range (Shift Pay), invoice clients (Client Invoices) and review everything paid (Paid Invoices). Every payment creates a PDF invoice stamped PAID that is emailed to the recipient.' },
  { topic: 'Accounting & payroll', q: 'How do online payments work?', a: '“Pay online” uses Stripe checkout; when payment completes you return to Accounting and the payment is recorded and emailed. “Cash” records it immediately.' },
  { topic: 'Accounting & payroll', q: 'Why does Shift Pay show “not approved”?', a: 'Shift Pay shows how many of each worker’s shifts are approved. Paying with unapproved shifts opens a popup: pay approved shifts only, or everything when your role may pay for unapproved shifts.' },

  // ---------------------------------------------------------------- Point of sale
  { topic: 'Point of sale', q: 'What is Point of Sale?', a: 'A sandbox for charging a customer’s card (Super Admin and Admin). It shows transactions and an earnings summary; the platform earns a percentage-plus-fixed fee on approved sales (set in its fee settings). No real money is charged.' },

  // ---------------------------------------------------------------- Meetings
  { topic: 'Meetings', q: 'How do I create a meeting?', a: 'Open Meetings and click “+ New Meeting”. Enter title, description, start and end, location or link, type (In person, Online, Hybrid), maximum participants, colour and notes. Tick “Paid meeting” and set a fee per participant when paid meetings are allowed.' },
  { topic: 'Meetings', q: 'How do participants and RSVPs work?', a: 'Open a meeting and use “Add Participant” to invite team members (and clients when allowed). Invitees get an email and answer Accept, Decline or Maybe; the organiser sees everyone’s status.' },
  { topic: 'Meetings', q: 'How do I record meeting payments?', a: 'For paid meetings use “Record Payment” (amount, method, transaction ID, notes). The Meeting Payments panel shows unpaid vs collected totals and the payment history.' },

  // ---------------------------------------------------------------- Announcements & notifications
  { topic: 'Announcements & notifications', q: 'How do announcements work?', a: 'Super Admins post announcements on the Announcements page. Which roles can see them is set in Settings → Announcements.' },
  { topic: 'Announcements & notifications', q: 'What notifications will I get?', a: 'The bell shows in-app notifications. Emails are sent when you are scheduled, for injury reports, meeting invites, credentials, invoices and payments; SMS is sent for schedules when it is configured.' },

  // ---------------------------------------------------------------- Reports & live map
  { topic: 'Reports & live map', q: 'What do Reports show?', a: 'Reports summarise hours worked (regular and overtime) and pay per person for a date range, with totals.' },
  { topic: 'Reports & live map', q: 'How does the Live Map work?', a: 'Super Admins, Admins and Managers see team members’ live GPS location while they are clocked in, updated in real time, and can view a shift’s location trail.' },

  // ---------------------------------------------------------------- Training portal
  { topic: 'Training portal', q: 'What is the Training portal and how do I open it?', a: 'The Training portal is a separate area for staff training with its own sign-in. If it is enabled for you, a “Training” tab appears in the sidebar and opens the portal without signing in again. You can also sign in directly on the training sign-in page (/training-login) with the training username and password that were emailed to you. Signing out of the training portal does not sign you out of the main app.' },
  { topic: 'Training portal', q: 'Who can enable the training portal for someone?', a: 'Super Admins can enable it for anyone, Admins for Managers and Users (caregivers), and Managers for Users. Use the “Enable training portal” switch when adding a team member, the Training portal card on a member’s profile, or the Access tab inside the training portal. Enabling creates a training username and emails a password to the person.' },
  { topic: 'Training portal', q: 'Can I see someone’s training password?', a: 'No. Passwords are stored securely and cannot be read back. Super Admins can see training usernames on the Access tab, and when they click “Reset password” the new password is shown once (and emailed). Admins and Managers can reset passwords too; the new password is emailed to the person. After 5 wrong training passwords, sign-in is blocked until the password is reset.' },
  { topic: 'Training portal', q: 'What kinds of trainings are there?', a: 'Videos, PDF documents and quizzes. Super Admins and Admins create them in the Catalog: upload a video or PDF (stored in your agency’s Cloudinary account) or paste a link, or build a quiz with answers and a pass mark. Managers can view the catalog to choose what to assign. Archived trainings can no longer be assigned.' },
  { topic: 'Training portal', q: 'Who can assign trainings?', a: 'Super Admins assign to Admins (and anyone below), Admins assign to Managers and Users, and Managers assign to Users. Go to Team Trainings → “Assign training”, pick the training, the people, a due date and an optional note. Only people with the training portal enabled can be assigned, and a person can’t have the same training open twice.' },
  { topic: 'Training portal', q: 'How do I complete a training?', a: 'Open it from My Trainings. Watch the video to the end, read the PDF, or answer the quiz and submit — if you don’t reach the pass mark you can try again. Your progress is saved as you go. When finished it moves to “Awaiting approval”. If a reviewer sends it back you’ll see their reason and can redo it.' },
  { topic: 'Training portal', q: 'Who approves completed trainings?', a: 'Admins approve Managers’ and Users’ trainings, Managers approve Users’ trainings, and Super Admins can approve everyone’s. Open Approvals in the training portal to Approve, Send back (a reason is required) or Cancel. Nobody can approve their own training.' },
  { topic: 'Training portal', q: 'Where can I see training status and reports?', a: 'The training Dashboard shows your progress and, for leaders, the team’s open, overdue and awaiting-approval counts. Every status change (assigned, started, submitted, approved, sent back, cancelled) is recorded in each training’s History and in Reports, where you can filter by dates and status and export a CSV. Training also appears in AI Analysis as “Training Compliance”.' },
  { topic: 'Training portal', q: 'What emails does the training portal send?', a: 'Emails go out when a training is assigned, completed and waiting for approval, approved, sent back or cancelled. Every morning (06:00 UTC) people get a “today is the last date” reminder for trainings due that day, and a “not completed” notice goes to the trainee and the person who assigned it when a due date passes. The Super Admin can turn these reminders on or off and set the default due days in Training → Settings.' },

  // ---------------------------------------------------------------- AI Analysis & assistant
  { topic: 'AI Analysis & assistant', q: 'What is AI Analysis?', a: 'Neural networks trained on your agency’s own history predict how the agency is doing: an overall health score, and for each area KPIs, charts with forecasts, findings, recommended actions and risk tables. Areas: Workforce Reliability, Shift Demand, Client Retention, Revenue & Payroll, Meetings, Recruitment, Security, Product Adoption, Office Performance, Billing & Approvals and Payer Mix & Coverage.' },
  { topic: 'AI Analysis & assistant', q: 'How do I run, save and share an analysis?', a: 'Open AI Analysis → New analysis, tick the areas, choose how much history to train on and how far ahead to predict, then “Run analysis”. Every report is saved under History; download it as PDF or HTML or email it to Admins and Managers. A daily report can be emailed automatically (Settings → AI Analysis).' },
  { topic: 'AI Analysis & assistant', q: 'What is the chat assistant?', a: 'The assistant button (bottom corner, draggable) answers questions about how to use WorkProvider360. It remembers your conversation; clear it from the chat window. It explains features but does not read your agency’s data.' },

  // ---------------------------------------------------------------- Security & logs
  { topic: 'Security & logs', q: 'What does the Security page show?', a: 'Super Admins see sign-in analytics (successful and failed logins, unauthorised access), detected threats such as SQL-injection attempts and request spikes, and the client IP of each event. Export it to PDF.' },
  { topic: 'Security & logs', q: 'What are Email Logs?', a: 'Every email the system sent, with its status. Super Admins always see them; Admins and Managers only when allowed in Settings → Log Access.' },
  { topic: 'Security & logs', q: 'Are changes to data recorded?', a: 'Yes. Every change to agency data (clients, payers, schedules, invoices, settings and more) is recorded with who made it and when, so changes can be traced. Passwords and large files are never copied into that record.' },

  // ---------------------------------------------------------------- Settings
  { topic: 'Settings', q: 'What can I change in Settings?', a: 'Company Profile, Team Members, Roles & Permissions, Scheduling (defaults, approval & invoicing), Meetings, Clients & Visits, Application Form, Log Access, Announcements, AI Analysis and Login Page. Most tabs are Super Admin only; others are read-only for your role.' },
  { topic: 'Settings', q: 'What is in Settings → Scheduling?', a: 'Admin / Manager scheduling access, default bill rate, pay rate and overtime multiplier for new shifts, admin / manager notifications on new shifts, auto clock-in/out, and Schedule approval & invoicing (who can approve, who can invoice unapproved visits).' },
  { topic: 'Settings', q: 'What is in Settings → Clients & Visits?', a: 'Client and service-type access for Admins and Managers; visit rules (auto clock-in/out, client signature on clock-in/out, GPS capture, same office, matching skill); the client portal switch and credentials email; client notifications; and which client fields are required.' },
  { topic: 'Settings', q: 'How do I change the login page and logo?', a: 'In Settings → Login Page the Super Admin edits the headline, subtitle, stats and testimonial on the sign-in screen. The agency logo is set from the company branding and shows in the app and on the login page.' },

  // ---------------------------------------------------------------- My profile & shortcuts
  { topic: 'My profile & shortcuts', q: 'How do I update my profile and password?', a: 'Open My Profile to change your photo (camera icon, crop and save), personal details, and your password (current and new password). Your upcoming shifts are under “My schedule”.' },
  { topic: 'My profile & shortcuts', q: 'How do keyboard shortcuts work?', a: 'Open the shortcuts panel, click “+ Add shortcut”, press the key combination and choose the page it opens. If two shortcuts use the same keys, only the first runs.' },

  // ---------------------------------------------------------------- Help & support
  { topic: 'Help & support', q: 'How do I contact support?', a: 'Open Support, describe the problem and send — it is emailed to the support team. The About page describes the software and its provider.' },
  { topic: 'Help & support', q: 'How do Help Center videos work?', a: 'How-to videos appear under each topic of the Help Center for the roles they are shown to. Super Admins (and Admins or Managers when allowed) upload them with “Upload video”: choose the file, title, topic and who can watch. Videos are stored in the agency’s Cloudinary account.' },
];
