/**
 * Fairmacs Learning Academy — Single Content & Brand Configuration (Pure JS)
 *
 * REAL WORKSPACE FACTS are populated directly from Fairmacs Shipping & Transport Services Pvt. Ltd.
 * Illustrative sample content (mini-lesson challenges, sample learner feedback) is explicitly
 * flagged with `isSample: true` / `[SAMPLE — REPLACE]` so you can edit everything in one file.
 */

export const SITE_CONTENT = {
  brand: {
    name: 'Fairmacs Learning Academy',
    legalEntity: 'Fairmacs Shipping & Transport Services Pvt. Ltd.',
    tagline: 'Across All Boundaries',
    secondaryCtaLabel: 'Employee Sign In',
    loginPath: '/login',
  },

  flags: {
    showDivisionsMarquee: true,
    showExternalPartnersMarquee: false,
    showLearningFormats: true,
    showSampleTestimonials: true,
  },

  contact: {
    addressLine1: 'No.4/244, 1st street Noombal road, Sri Devi nagar, Kattupakkam',
    addressLine2: 'Poonamallee, Chennai, Tamil Nadu - 600077, India',
    fullAddress:
      ' No.4/244, 1st street Noombal road, Sri Devi nagar, Kattupakkam, Poonamallee, Goparasanallur, Tamil Nadu 600077',
    email: 'fla@fairmacs.com',
    phone: '',
    whatsappUrl: '',
    linkedinUrl: '',
  },

  navLinks: [
    { label: 'Programs', href: '#programs' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Outcomes', href: '#outcomes' },
    { label: 'FAQ', href: '#faq' },
  ],

  hero: {
    eyebrow: 'Enterprise Learning for Global Logistics Teams',
    floatingChips: [
      { label: 'Role-mapped learning paths' },
      { label: 'Verifiable certificates' },
    ],
    headlineLines: [
      ['Ship', 'smarter'],
      ['decisions', 'across'],
      ['every', 'boundary.'],
    ],
    highlightedWord: 'boundary.',
    subcopy:
      'Structured logistics curricula, watermarked SOP playbooks, live trainer cohorts, and verifiable certifications—built for Fairmacs teams across global freight, documentation, pricing, and compliance.',
    trustRow: [
      '10 Operational Divisions',
      'Role-Mapped Paths',
      'Tamper-Evident Cert IDs',
      'Self-Paced + Live Cohorts',
    ],
  },

  divisions: [
    'Freight Forwarding Operations',
    'Shipping Documentation',
    'Commercial Pricing & Quotations',
    'Customer Service Excellence',
    'Global Sales & Trade',
    'People Operations',
    'Finance & Accounts',
    'Information Technology',
    'Corporate Governance & SOPs',
    'Workplace Administration',
  ],

  playgroundTracks: [
    { id: 'freight', label: 'Freight Ops' },
    { id: 'docs', label: 'Documentation' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'compliance', label: 'Compliance' },
  ],

  playgroundLevels: ['Foundation', 'Practitioner', 'Lead'],

  playgroundChallenges: [
    {
      id: 'chg-freight-foundation',
      track: 'freight',
      trackLabel: 'Freight Ops',
      level: 'Foundation',
      moduleTag: 'Incoterms® 2020 Essentials',
      durationMinutes: 6,
      scenarioContext: '[SAMPLE CHALLENGE] FCL export shipment departing Chennai Port under FOB terms.',
      question: 'Under FOB (Free On Board), when does risk transfer from seller to buyer?',
      options: [
        'Once cargo is loaded on board the nominated vessel at port of shipment',
        'When goods leave the seller’s warehouse gate',
        'After customs clearance at the destination port',
      ],
      correctIndex: 0,
      explanation:
        'Under FOB Incoterms® 2020, risk transfers the moment goods are placed on board the vessel nominated by the buyer at the named port of shipment.',
      isSample: true,
    },
    {
      id: 'chg-freight-practitioner',
      track: 'freight',
      trackLabel: 'Freight Ops',
      level: 'Practitioner',
      moduleTag: 'Container Turnaround & Demurrage',
      durationMinutes: 8,
      scenarioContext: '[SAMPLE CHALLENGE] Import FCL box arrives with 7 free port days; consignee clearance faces a 2-day hold.',
      question: 'Which action prevents avoidable detention charges after port gate-out?',
      options: [
        'Pre-schedule empty container return slot & warehouse de-stuffing before gate-out',
        'Wait until port demurrage invoice generates to notify customer service',
        'Request Bill of Lading amendment after empty return deadline passes',
      ],
      correctIndex: 0,
      explanation:
        'Coordinating de-stuffing and empty depot return before gate-out keeps detention within free days.',
      isSample: true,
    },
    {
      id: 'chg-freight-lead',
      track: 'freight',
      trackLabel: 'Freight Ops',
      level: 'Lead',
      moduleTag: 'Multi-Modal Exception Routing',
      durationMinutes: 10,
      scenarioContext: '[SAMPLE CHALLENGE] Transshipment hub congestion threatens a time-critical project cargo milestone.',
      question: 'What is the first escalation step under SOP exception management?',
      options: [
        'Log carrier roll-over risk, evaluate alternate feeder/air-sea split & alert key account owner',
        'Hold customer notification until revised ETA is finalized at destination',
        'Cancel marine cargo insurance endorsement immediately',
      ],
      correctIndex: 0,
      explanation:
        'Proactive exception logging with costed routing options preserves SLA trust and shipper decision time.',
      isSample: true,
    },
    {
      id: 'chg-docs-foundation',
      track: 'docs',
      trackLabel: 'Documentation',
      level: 'Foundation',
      moduleTag: 'Bill of Lading Accuracy',
      durationMinutes: 5,
      scenarioContext: '[SAMPLE CHALLENGE] Pre-alert check comparing Commercial Invoice, Packing List, and Draft HBL.',
      question: 'What must match word-for-word before releasing an Original Bill of Lading under a Letter of Credit?',
      options: [
        'Consignee details, cargo description, package count, gross weight, and LC terms',
        'Only the vessel name and container tare weight',
        'Internal booking reference code only',
      ],
      correctIndex: 0,
      explanation:
        'Discrepancies between Draft BL, Invoice, Packing List, and LC clauses cause bank rejection and port delays.',
      isSample: true,
    },
    {
      id: 'chg-docs-practitioner',
      track: 'docs',
      trackLabel: 'Documentation',
      level: 'Practitioner',
      moduleTag: 'Sea Waybill vs. Original BL',
      durationMinutes: 7,
      scenarioContext: '[SAMPLE CHALLENGE] Trusted repeat consignee needs immediate cargo release on a 3-day short-sea transit.',
      question: 'Which document avoids original paper courier delays when title negotiation is not required?',
      options: [
        'Express Sea Waybill (non-negotiable) with verified shipper authorization',
        'Unendorsed To-Order Original Bill of Lading held at origin',
        'Proforma freight quotation sheet',
      ],
      correctIndex: 0,
      explanation:
        'An Express Sea Waybill releases cargo to the named consignee upon identity verification without surrendering paper originals.',
      isSample: true,
    },
    {
      id: 'chg-docs-lead',
      track: 'docs',
      trackLabel: 'Documentation',
      level: 'Lead',
      moduleTag: 'Customs & Manifest Governance',
      durationMinutes: 9,
      scenarioContext: '[SAMPLE CHALLENGE] Post-manifest shipper weight correction arrives 4 hours before vessel cut-off.',
      question: 'Which compliance sequence protects both VGM accuracy and customs filing?',
      options: [
        'Verify calibrated VGM certificate, file manifest amendment before cut-off, and archive audit trail',
        'Defer VGM update until destination arrival notice',
        'Override gross weight verbally without shipper written confirmation',
      ],
      correctIndex: 0,
      explanation:
        'SOLAS VGM and customs manifest amendments require documented shipper verification prior to loading cut-off.',
      isSample: true,
    },
    {
      id: 'chg-pricing-foundation',
      track: 'pricing',
      trackLabel: 'Pricing',
      level: 'Foundation',
      moduleTag: 'LCL Chargeable Weight (W/M)',
      durationMinutes: 6,
      scenarioContext: '[SAMPLE CHALLENGE] LCL console cargo measures 4.2 CBM and weighs 1,850 kg (1,000 kg = 1 CBM).',
      question: 'What is the chargeable ocean freight basis (W/M) for this LCL shipment?',
      options: [
        '4.2 Revenue Tons (volume CBM exceeds gross weight in metric tons)',
        '1.85 Revenue Tons (gross weight in metric tons)',
        '2.35 Revenue Tons (difference between CBM and weight)',
      ],
      correctIndex: 0,
      explanation:
        'LCL ocean freight bills on whichever is greater: Volume (4.2 CBM) vs. Weight (1.85 MT) = 4.2 W/M.',
      isSample: true,
    },
    {
      id: 'chg-pricing-practitioner',
      track: 'pricing',
      trackLabel: 'Pricing',
      level: 'Practitioner',
      moduleTag: 'All-In Quotation Integrity',
      durationMinutes: 7,
      scenarioContext: '[SAMPLE CHALLENGE] Preparing a door-to-port quote during peak season surcharge volatility.',
      question: 'What must every valid customer quotation state clearly to prevent margin leakage?',
      options: [
        'Rate validity window, BAF/PSS surcharge inclusions/exclusions, free time, and currency ROE basis',
        'Base ocean freight slot number only without validity date',
        'Estimated transit time without origin THC breakdown',
      ],
      correctIndex: 0,
      explanation:
        'Transparent validity dates, surcharge scope, ROE rules, and free-time terms eliminate billing disputes.',
      isSample: true,
    },
    {
      id: 'chg-pricing-lead',
      track: 'pricing',
      trackLabel: 'Pricing',
      level: 'Lead',
      moduleTag: 'Tender Margin & Carrier Allocation',
      durationMinutes: 10,
      scenarioContext: '[SAMPLE CHALLENGE] Annual RFQ across 6 trade lanes with fluctuating spot vs. contract rates.',
      question: 'How should pricing leads balance named-account commitments against spot exposure?',
      options: [
        'Blend core MQC contract allocations with quarterly bunker adjustment clauses',
        'Lock 100% fixed 12-month rates with zero surcharge pass-through',
        'Quote below variable origin handling cost on all lanes',
      ],
      correctIndex: 0,
      explanation:
        'Structured MQC allocations paired with indexed bunker triggers protect both customer space and commercial margin.',
      isSample: true,
    },
    {
      id: 'chg-compliance-foundation',
      track: 'compliance',
      trackLabel: 'Compliance',
      level: 'Foundation',
      moduleTag: 'Confidential SOP Governance',
      durationMinutes: 5,
      scenarioContext: '[SAMPLE CHALLENGE] Reviewing a watermarked corporate policy PDF inside Fairmacs Learning Academy.',
      question: 'Why does every policy PDF display your name, Employee ID, and live timestamp?',
      options: [
        'To maintain individual audit traceability and protect proprietary Fairmacs procedures',
        'As a decorative page border only',
        'To replace assessment passing thresholds',
      ],
      correctIndex: 0,
      explanation:
        'Dynamic per-employee watermarking paired with immutable digital acknowledgement safeguards confidential SOPs.',
      isSample: true,
    },
    {
      id: 'chg-compliance-practitioner',
      track: 'compliance',
      trackLabel: 'Compliance',
      level: 'Practitioner',
      moduleTag: 'Know Your Counterparty & Sanctions',
      durationMinutes: 8,
      scenarioContext: '[SAMPLE CHALLENGE] New shipper onboarding requests routing near a restricted dual-use commodity code.',
      question: 'What is mandatory before confirming booking acceptance?',
      options: [
        'Complete HS-code screening, end-user declaration check, and compliance sign-off',
        'Accept booking first and verify commodity after vessel departure',
        'Rely solely on generic cargo description "general merchandise"',
      ],
      correctIndex: 0,
      explanation:
        'Vague descriptions like "general cargo" and unscreened HS codes are red flags requiring pre-booking compliance clearance.',
      isSample: true,
    },
    {
      id: 'chg-compliance-lead',
      track: 'compliance',
      trackLabel: 'Compliance',
      level: 'Lead',
      moduleTag: 'Departmental Audit Readiness',
      durationMinutes: 8,
      scenarioContext: '[SAMPLE CHALLENGE] Updated SOP version v2.1 is published by HR & Compliance with a 7-day due date.',
      question: 'How do department managers ensure 100% audit readiness before deadline?',
      options: [
        'Track pending acknowledgements on the Manager Policy dashboard and trigger targeted reminders',
        'Assume verbal team briefing satisfies electronic audit logs',
        'Archive v1.0 locally without recording v2.1 sign-off',
      ],
      correctIndex: 0,
      explanation:
        'Real-time version tracking and immutable electronic acknowledgements provide complete statutory and internal audit proof.',
      isSample: true,
    },
  ],

  bentoCategories: [
    { id: 'all', label: 'All Academy Tracks' },
    { id: 'freight', label: 'Freight & Ops' },
    { id: 'docs', label: 'Documentation' },
    { id: 'commercial', label: 'Pricing & Sales' },
    { id: 'compliance', label: 'SOPs & Leadership' },
  ],

  programs: [
    {
      id: 'prog-freight-ops',
      category: 'freight',
      categoryLabel: 'Freight & Operations',
      level: 'Practitioner',
      title: 'End-to-End Ocean & Air Freight Operations',
      outcomeHeadline: 'Execute FCL, LCL, and air consoles from booking to delivery without costly handoff gaps.',
      summary:
        'Covers Incoterms® 2020 risk transfer, carrier scheduling, transshipment exception handling, and port turnaround control.',
      modulesCount: 6,
      estimatedHours: '4.5 hrs + Live Cohort',
      featured: true,
      accentWash: 'sky',
      rolesTargeted: ['Operations Executives', 'Import/Export Coordinators', 'Branch Ops Leads'],
      syllabusHighlights: [
        'Incoterms® 2020 cost vs. risk responsibility matrix',
        'FCL, LCL consolidation & air cargo cut-off planning',
        'Demurrage, detention & exception escalation SOPs',
        'Server-graded operational case assessment',
      ],
      certificationType: 'Verifiable Fairmacs Academy Certificate (FM-CERT)',
    },
    {
      id: 'prog-shipping-docs',
      category: 'docs',
      categoryLabel: 'Documentation',
      level: 'Foundation',
      title: 'Zero-Discrepancy Shipping Documentation',
      outcomeHeadline: 'Draft and audit Bills of Lading, manifests, and LC sets right the first time.',
      summary:
        'Master HBL/MBL reconciliation, Sea Waybills, SOLAS VGM verification, Certificate of Origin checks, and pre-alert workflows.',
      modulesCount: 5,
      estimatedHours: '3.5 hrs',
      featured: false,
      accentWash: 'mint',
      rolesTargeted: ['Documentation Specialists', 'Export/Import Desk', 'Customer Service'],
      syllabusHighlights: [
        'HBL vs. MBL clause alignment & consignee verification',
        'Letter of Credit document checklist & discrepancy prevention',
        'SOLAS VGM, IGM/EGM filing timelines & amendment controls',
      ],
      certificationType: 'Verifiable Fairmacs Academy Certificate (FM-CERT)',
    },
    {
      id: 'prog-pricing-desk',
      category: 'commercial',
      categoryLabel: 'Pricing & Commercials',
      level: 'Practitioner',
      title: 'Freight Pricing, W/M Calculations & Margin Protection',
      outcomeHeadline: 'Build accurate, competitive multi-lane quotes with zero surcharge surprises.',
      summary:
        'Hands-on training in chargeable weight (W/M), local THC/PSS/BAF structures, ROE buffers, and RFQ response turnarounds.',
      modulesCount: 4,
      estimatedHours: '3 hrs',
      featured: false,
      accentWash: 'peach',
      rolesTargeted: ['Pricing Analysts', 'Inside Sales', 'Key Account Managers'],
      syllabusHighlights: [
        'Ocean W/M & Air volumetric (1:6000) calculation drills',
        'Origin/destination local charges & validity guardrails',
        'Multi-carrier rate comparison & tender structuring',
      ],
      certificationType: 'Verifiable Fairmacs Academy Certificate (FM-CERT)',
    },
    {
      id: 'prog-customer-trade',
      category: 'commercial',
      categoryLabel: 'Sales & Customer Service',
      level: 'Foundation',
      title: 'Consultative Logistics Sales & Proactive Shipment Care',
      outcomeHeadline: 'Turn shipment updates and trade enquiries into long-term shipper trust.',
      summary:
        'Structured communication templates, milestone pre-alerts, exception recovery, and discovery frameworks for logistics accounts.',
      modulesCount: 4,
      estimatedHours: '3 hrs',
      featured: false,
      accentWash: 'lilac',
      rolesTargeted: ['Sales Executives', 'Customer Service Teams', 'Key Account Coordinators'],
      syllabusHighlights: [
        'Shipper discovery & lane requirement qualification',
        'Pre-alert cadences & proactive delay communication',
        'Cross-functional handover between Sales, Pricing & Ops',
      ],
      certificationType: 'Verifiable Fairmacs Academy Certificate (FM-CERT)',
    },
    {
      id: 'prog-sop-governance',
      category: 'compliance',
      categoryLabel: 'Compliance & Governance',
      level: 'Foundation',
      title: 'Corporate Policies, Information Security & Trade Compliance',
      outcomeHeadline: 'Stay 100% audit-ready across workplace policies, data security, and cargo screening.',
      summary:
        'Mandatory onboarding and annual refresher modules paired with watermarked SOP reading and timestamped digital sign-off.',
      modulesCount: 5,
      estimatedHours: '2.5 hrs',
      featured: true,
      accentWash: 'mint',
      rolesTargeted: ['All Fairmacs Employees', 'New Joiners', 'Department Managers'],
      syllabusHighlights: [
        'Code of Conduct & workplace ethics across Fairmacs',
        'Confidential document handling & Zoho WorkDrive security',
        'Sanctions, HS-code red flags & counterparty screening',
        'Formal electronic policy acknowledgement workflow',
      ],
      certificationType: 'Compliance Completion + Timestamped Audit Record',
    },
    {
      id: 'prog-manager-lead',
      category: 'compliance',
      categoryLabel: 'Leadership & People Ops',
      level: 'Lead',
      title: 'Team Compliance & Operational Coaching for Managers',
      outcomeHeadline: 'Lead high-accountability logistics teams with clear coaching and zero overdue SLAs.',
      summary:
        'Equips reporting managers to assign role curricula, interpret team analytics, coach through operational errors, and oversee SOP sign-offs.',
      modulesCount: 4,
      estimatedHours: '3 hrs + Workshop',
      featured: false,
      accentWash: 'sky',
      rolesTargeted: ['Branch Managers', 'Team Leads', 'People Operations'],
      syllabusHighlights: [
        'Using real-time team compliance matrices & due-date alerts',
        'Structured root-cause debriefs after shipment exceptions',
        '30-60-90 day onboarding milestones for new hires',
      ],
      certificationType: 'Leadership Track Credential (FM-CERT)',
    },
  ],

  howItWorks: [
    {
      stepNumber: '01',
      title: 'Role-Mapped Assignment',
      description:
        'HR and reporting managers assign foundational courses and mandatory SOPs tailored to your division—from Freight Operations to Pricing or Finance.',
      detailBadge: 'Department & Role Synced',
    },
    {
      stepNumber: '02',
      title: 'Interactive Lessons & Cloud SOPs',
      description:
        'Study bite-sized video walkthroughs and confidential watermarked PDF guides streamed securely from Zoho WorkDrive on desktop or phone.',
      detailBadge: 'Self-Paced + Live Sessions',
    },
    {
      stepNumber: '03',
      title: 'Server-Verified Assessments',
      description:
        'Validate practical decision-making through timed, scenario-driven quizzes graded authoritatively on the backend—plus   .',
      detailBadge: 'Scenario-Based Mastery',
    },
    {
      stepNumber: '04',
      title: 'Verifiable Certification & Audit Trail',
      description:
        'Earn instant OpenPDF certificates with tamper-resistant FM-CERT IDs and maintain an up-to-date compliance transcript across your career at Fairmacs.',
      detailBadge: 'Instant FM-CERT Credential',
    },
  ],

  outcomes: [
    {
      id: 'metric-divisions',
      value: 10,
      suffix: '',
      label: 'Operational Divisions Connected',
      sublabel: 'Operations, Documentation, Pricing, Sales, CS, Accounts, IT, Admin & People Ops',
    },
    {
      id: 'metric-workspaces',
      value: 4,
      suffix: '',
      label: 'Tailored Role Workspaces',
      sublabel: 'Dedicated portals for Employees, Trainers, Reporting Managers & HR Admins',
    },
    {
      id: 'metric-verification',
      value: 100,
      suffix: '%',
      label: 'Verifiable Credential & SOP Logs',
      sublabel: 'Every certificate & policy acknowledgement carries a tamper-evident audit record',
    },
    {
      id: 'metric-access',
      value: 24,
      suffix: '/7',
      label: 'Cloud Curriculum & Calendar Access',
      sublabel: 'Responsive desktop & mobile learning synced with live training schedules',
    },
  ],

  mentorsAndMethod: [
    {
      id: 'method-practitioners',
      badge: 'Practitioner-Authored',
      title: 'Taught by Senior Freight & Documentation Leads',
      roleOrFocus: 'Internal Subject-Matter Trainers',
      description:
        'Courses aren’t generic textbook slides—every module is built from real port cut-offs, LC checklists, and commercial routing scenarios handled across Fairmacs.',
      highlights: ['Real Bill of Lading & W/M case walkthroughs', 'Direct Q&A during scheduled calendar sessions'],
    },
    {
      id: 'method-security',
      badge: 'Enterprise Governance',
      title: 'Protected SOPs with Live Watermark Traceability',
      roleOrFocus: 'Zoho WorkDrive + Compliance Engine',
      description:
        'Proprietary operating manuals stream directly from encrypted cloud folders with per-viewer watermarking and single-click formal acknowledgement.',
      highlights: ['Version-controlled policy releases', 'Automated due-soon reminders & manager digests'],
    },
    {
      id: 'method-progression',
      badge: 'Measurable Growth',
      title: 'From Day-One Onboarding to Branch Leadership',
      roleOrFocus: 'Structured Capability Ladders',
      description:
        'Clear milestones guide new joiners through first-month essentials and prepare experienced executives for pricing, key-account, and supervisory roles.',
      highlights: ['Visual streak & progress tracking', 'Downloadable PDF & Excel transcripts'],
    },
  ],

  testimonials: [
    {
      id: 'sample-quote-1',
      quote:
        '[SAMPLE — REPLACE] Having Incoterms®, Draft BL checklists, and live trainer sessions in one place cut new-joiner ramp-up questions across our documentation desk.',
      authorLabel: 'Documentation Team Lead (Sample Preview)',
      division: 'Shipping Documentation',
      trackCompleted: 'Zero-Discrepancy Shipping Documentation',
      isSample: true,
    },
    {
      id: 'sample-quote-2',
      quote:
        '[SAMPLE — REPLACE] The W/M pricing drills and surcharge checklists make quoting complex multi-leg shipments consistent across every branch.',
      authorLabel: 'Commercial Pricing Executive (Sample Preview)',
      division: 'Pricing & Quotations',
      trackCompleted: 'Freight Pricing & Margin Protection',
      isSample: true,
    },
    {
      id: 'sample-quote-3',
      quote:
        '[SAMPLE — REPLACE] Tracking mandatory SOP acknowledgements and upcoming live sessions from a single calendar keeps our entire reporting line audit-ready.',
      authorLabel: 'Operations Manager (Sample Preview)',
      division: 'Freight Forwarding Operations',
      trackCompleted: 'Team Compliance & Operational Coaching',
      isSample: true,
    },
  ],

  learningFormats: [
    {
      id: 'format-onboarding',
      name: 'Day-One Foundation',
      audience: 'New Joiners & Cross-Functional Transfers',
      cadence: 'Self-Paced · Week 1–2',
      description:
        'Core orientation across Fairmacs business divisions, mandatory workplace policies, and foundational freight terminology.',
      features: [
        'Immediate Employee ID portal access',
        'Mandatory SOP reading & digital sign-off',
        'Baseline orientation quiz & completion badge',
      ],
      ctaLabel: 'Enquire for Onboarding',
    },
    {
      id: 'format-cohort',
      name: 'Role Mastery Cohort',
      audience: 'Operations, Docs, Pricing & Sales Teams',
      cadence: 'Hybrid · Self-Paced + Live Workshops',
      recommended: true,
      description:
        'Deep operational tracks combining cloud SOP guides, scenario assessments, and calendar-scheduled live doubt-clearing with Fairmacs trainers.',
      features: [
        'Sequential module unlocking & case drills',
        'Live trainer sessions on the Compliance Calendar',
        'Server-graded assessment & verifiable FM-CERT PDF',
        'Manager & HR progress transcript visibility',
      ],
      ctaLabel: 'Request Cohort Schedule',
    },
    {
      id: 'format-leadership',
      name: 'Compliance & Leadership',
      audience: 'Managers, Branch Heads & Trainers',
      cadence: 'Continuous · Quarterly Refreshers',
      description:
        'Governance, trade-compliance updates, team analytics oversight, and curriculum authoring tools for departmental leaders.',
      features: [
        'Departmental compliance matrix & Excel exports',
        'Course Builder Wizard & Zoho WorkDrive publishing',
        'Automated policy version rollout & audit logs',
      ],
      ctaLabel: 'Connect with HR Academy',
    },
  ],

  faqs: [
    {
      id: 'faq-access',
      question: 'How do Fairmacs employees sign in to start learning?',
      answer:
        'Active employees sign in at /login using their official Fairmacs Employee ID or corporate email and password. New joiners receive credentials during HR onboarding and are prompted to set a personal password on first sign-in.',
    },
    {
      id: 'faq-tracks',
      question: 'Can department managers request a custom training cohort or new SOP module?',
      answer:
        'Yes. Department heads and trainers can submit a cohort or curriculum request using the enquiry form below (or contact fla@fairmacs.com), and HR Admins can assign courses by department, role group, or individual.',
    },
    {
      id: 'faq-certs',
      question: 'How do certificates and policy acknowledgements work?',
      answer:
        'Once you complete all sequential lessons and meet the passing score on the server-graded quiz, Fairmacs Learning Academy generates a downloadable PDF certificate with a unique FM-CERT verification ID. Policy PDFs record an immutable timestamped acknowledgement.',
    },
    {
      id: 'faq-mobile',
      question: 'Can I complete lessons and check training schedules on my phone?',
      answer:
        'Yes. Fairmacs Learning Academy is fully responsive across phones, tablets, and desktops—including touch-friendly navigation, mobile agenda calendar views, and in-browser document streaming.',
    },
    {
      id: 'faq-support',
      question: 'Who should I contact if I need a password reset or enrolment help?',
      answer:
        'Use the Forgot Password guide on the Sign In screen or email the Fairmacs HR & Learning Administration team at fla@fairmacs.com.',
    },
  ],
};
