// Fairmacs KMS Mock Dataset & Domain Definitions

export const MOCK_USERS_DATABASE = [
  {
    id: 'EMP1001',
    name: 'Arjun Kumar',
    role: 'EMPLOYEE',
    roleLabel: 'Employee',
    designation: 'Operations Executive',
    department: 'Operations',
    branch: 'Chennai HQ',
    email: 'arjun.kumar@fairmacs.com',
    joiningDate: '2024-03-15',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'
  },
  {
    id: 'EMP1002',
    name: 'Kavita Sharma',
    role: 'EMPLOYEE',
    roleLabel: 'Employee',
    designation: 'Documentation Executive',
    department: 'Documentation',
    branch: 'Chennai HQ',
    email: 'kavita.sharma@fairmacs.com',
    joiningDate: '2023-11-01',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=250'
  },
  {
    id: 'EMP1003',
    name: 'Priya Nair',
    role: 'EMPLOYEE',
    roleLabel: 'Employee',
    designation: 'Accounts Executive',
    department: 'Accounts',
    branch: 'Mumbai Branch',
    email: 'priya.nair@fairmacs.com',
    joiningDate: '2023-05-12',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250'
  },
  {
    id: 'EMP1004',
    name: 'Ananya Rao',
    role: 'EMPLOYEE',
    roleLabel: 'Employee',
    designation: 'HR Executive',
    department: 'HR',
    branch: 'Corporate HQ',
    email: 'ananya.rao@fairmacs.com',
    joiningDate: '2024-01-10',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=250'
  },
  {
    id: 'EMP1005',
    name: 'Karthik S',
    role: 'EMPLOYEE',
    roleLabel: 'Employee',
    designation: 'Software Engineer',
    department: 'IT',
    branch: 'Chennai HQ',
    email: 'karthik.s@fairmacs.com',
    joiningDate: '2023-09-01',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250'
  },
  {
    id: 'TRN1001',
    name: 'Priya Instructor',
    role: 'TRAINER',
    roleLabel: 'Trainer',
    designation: 'Senior L&D Instructor',
    department: 'HR',
    branch: 'Corporate HQ',
    email: 'priya.instructor@fairmacs.com',
    joiningDate: '2022-01-10',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250'
  },
  {
    id: 'MGR1001',
    name: 'Rahul Menon',
    role: 'MANAGER',
    roleLabel: 'Manager',
    designation: 'Operations Manager',
    department: 'Operations',
    branch: 'Mumbai Branch',
    email: 'rahul.menon@fairmacs.com',
    joiningDate: '2019-06-20',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250'
  },
  {
    id: 'HR1001',
    name: 'Admin User',
    role: 'HR_ADMIN',
    roleLabel: 'HR / Admin',
    designation: 'Head of Human Resources & Compliance',
    department: 'HR',
    branch: 'Corporate HQ',
    email: 'admin.hr@fairmacs.com',
    joiningDate: '2018-04-01',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=250'
  }
];

export const CURRENT_USER_ROLES = {
  EMPLOYEE: MOCK_USERS_DATABASE[0],
  TRAINER: MOCK_USERS_DATABASE[5],
  MANAGER: MOCK_USERS_DATABASE[6],
  ADMIN: MOCK_USERS_DATABASE[7]
};

// Department-Based Learning Path Auto-Assignment Rules Matrix
export const DEPARTMENT_LEARNING_PATHS = {
  Documentation: {
    department: 'Documentation',
    mandatoryCourseIds: ['ORI-001', 'CUS-301', 'AFO-201', 'SEC-101'],
    recommendedCourseIds: ['LFF-101', 'CSV-202'],
    description: 'Mandatory documentation verification, customs tariffing, air cargo waybill SOPs, and compliance rules.'
  },
  Accounts: {
    department: 'Accounts',
    mandatoryCourseIds: ['ORI-001', 'SEC-101', 'CUS-301'],
    recommendedCourseIds: ['LFF-101', 'CSV-202'],
    description: 'Mandatory corporate orientation, InfoSec awareness, and customs duty valuation standards.'
  },
  Operations: {
    department: 'Operations',
    mandatoryCourseIds: ['ORI-001', 'LFF-101', 'AFO-201', 'DGA-401'],
    recommendedCourseIds: ['SEA-202', 'CUS-301'],
    description: 'Freight forwarding lifecycle, air/sea cargo SOPs, and dangerous goods UN safety rules.'
  },
  Sales: {
    department: 'Sales',
    mandatoryCourseIds: ['ORI-001', 'LFF-101', 'CSV-202'],
    recommendedCourseIds: ['AFO-201', 'SEC-101'],
    description: 'Freight forwarding fundamentals, customer service SLA protocols, and key account management.'
  },
  HR: {
    department: 'HR',
    mandatoryCourseIds: ['ORI-001', 'SEC-101', 'CSV-202'],
    recommendedCourseIds: ['LEA-301'],
    description: 'Company induction, workplace code of ethics, information security, and leadership tracks.'
  },
  IT: {
    department: 'IT',
    mandatoryCourseIds: ['ORI-001', 'SEC-101'],
    recommendedCourseIds: ['LFF-101'],
    description: 'Cybersecurity hygiene, multi-factor authentication, and logistics IT architecture overview.'
  }
};

// Department Analytics Data Table
export const MOCK_DEPARTMENTS_DATA = [
  { department: 'Documentation', head: 'Kavita Sharma', employeeCount: 24, activeCoursesCount: 8, completionRate: 87.5 },
  { department: 'Accounts', head: 'Priya Nair', employeeCount: 18, activeCoursesCount: 6, completionRate: 91.2 },
  { department: 'Operations', head: 'Rahul Menon', employeeCount: 42, activeCoursesCount: 12, completionRate: 78.4 },
  { department: 'Sales', head: 'Vikram Seth', employeeCount: 16, activeCoursesCount: 7, completionRate: 84.0 },
  { department: 'HR', head: 'Admin User', employeeCount: 8, activeCoursesCount: 5, completionRate: 96.0 },
  { department: 'IT', head: 'Karthik S', employeeCount: 10, activeCoursesCount: 6, completionRate: 93.1 }
];

export const COURSE_CATEGORIES = [
  'All Categories',
  'Logistics',
  'Freight Forwarding',
  'Air Freight',
  'Sea Freight',
  'Import & Export',
  'Customs & Compliance',
  'Safety',
  'Cybersecurity',
  'Customer Service',
  'Soft Skills',
  'Leadership'
];

export const COURSES = [
  {
    id: 'LFF-101',
    title: 'Freight Forwarding Fundamentals',
    category: 'Logistics & Freight Forwarding',
    level: 'Beginner',
    duration: '3.5 Hours',
    rating: 4.9,
    enrolledCount: 142,
    mandatoryFor: ['Operations', 'Sales', 'Customer Service', 'New Joiner'],
    banner: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800',
    description: 'Master the end-to-end freight forwarding lifecycle, transport modes, Incoterms, and global logistics execution principles.',
    passingScore: 80,
    modules: [
      {
        id: 'm1',
        title: 'Module 1: Introduction to Global Logistics & Forwarding',
        lessons: [
          { id: 'l1', title: '1.1 What is Freight Forwarding & Supply Chain?', duration: '12 mins', type: 'video', assetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
          { id: 'l2', title: '1.2 Key Industry Stakeholders & Carrier Relationships', duration: '15 mins', type: 'video', assetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
          { id: 'l3', title: '1.3 Fairmacs Global Operational Architecture SOP', duration: '8 pages', type: 'pdf', assetUrl: 'SOP_Fairmacs_Forwarding_Overview.pdf' }
        ]
      },
      {
        id: 'm2',
        title: 'Module 2: Transport Modes & Incoterms 2020 Rules',
        lessons: [
          { id: 'l4', title: '2.1 Air vs Ocean vs Multimodal Transport Selection', duration: '18 mins', type: 'video', assetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' },
          { id: 'l5', title: '2.2 Understanding Incoterms (EXW, FOB, CIF, DDP)', duration: '10 pages', type: 'pdf', assetUrl: 'Incoterms_2020_Guide.pdf' }
        ]
      }
    ],
    quiz: {
      id: 'q-lff-101',
      title: 'Freight Forwarding Fundamentals Certification Exam',
      timeLimitMinutes: 15,
      questions: [
        {
          id: 'q1',
          type: 'mcq',
          question: 'Which Incoterm specifies that the seller delivers goods loaded on board the vessel nominated by the buyer at the named port of shipment?',
          options: ['EXW (Ex Works)', 'FOB (Free on Board)', 'DDP (Delivered Duty Paid)', 'CIF (Cost, Insurance & Freight)'],
          correctIndex: 1
        },
        {
          id: 'q2',
          type: 'true_false',
          question: 'In Freight Forwarding, a NVOCC (Non-Vessel Operating Common Carrier) issues its own Bills of Lading without owning shipping vessels.',
          options: ['True', 'False'],
          correctIndex: 0
        },
        {
          id: 'q3',
          type: 'scenario',
          question: 'Scenario: A customer requests shipment under CIF terms. Who is responsible for purchasing marine insurance for the transit duration?',
          options: ['The Buyer', 'The Seller', 'The Freight Forwarder', 'The Shipping Line'],
          correctIndex: 1
        }
      ]
    }
  },
  {
    id: 'AFO-201',
    title: 'Air Freight Operations & AWB Management',
    category: 'Air Freight Operations',
    level: 'Intermediate',
    duration: '4.0 Hours',
    rating: 4.8,
    enrolledCount: 98,
    mandatoryFor: ['Operations', 'Documentation'],
    banner: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=800',
    description: 'Comprehensive operational manual for air cargo booking, Master & House Air Waybill issuance, IATA rules, and ULD container handling.',
    passingScore: 80,
    modules: [
      {
        id: 'm1',
        title: 'Module 1: Air Cargo Infrastructure & Booking',
        lessons: [
          { id: 'l1', title: '1.1 IATA Regulations & Airline Booking SOPs', duration: '15 mins', type: 'video', assetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoylikes.mp4' },
          { id: 'l2', title: '1.2 Aircraft Types & Unit Load Devices (ULD)', duration: '12 pages', type: 'pdf', assetUrl: 'Air_Cargo_ULD_Manual.pdf' }
        ]
      },
      {
        id: 'm2',
        title: 'Module 2: Master Air Waybill (MAWB) vs House AWB (HAWB)',
        lessons: [
          { id: 'l3', title: '2.1 HAWB Creation & Field Validation Rules', duration: '20 mins', type: 'video', assetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4' },
          { id: 'l4', title: '2.2 Cargo Acceptance & Airline Security Screening', duration: '14 mins', type: 'video', assetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' }
        ]
      }
    ],
    quiz: {
      id: 'q-afo-201',
      title: 'Air Freight Operations Final Assessment',
      timeLimitMinutes: 20,
      questions: [
        {
          id: 'q1',
          type: 'true_false',
          question: 'A House Air Waybill (HAWB) is issued by a freight forwarder to a shipper, whereas a Master Air Waybill (MAWB) is issued by the airline to the freight forwarder.',
          options: ['True', 'False'],
          correctIndex: 0
        },
        {
          id: 'q2',
          type: 'mcq',
          question: 'What is the volumetric weight ratio formula commonly used in IATA air freight calculations?',
          options: ['1 CBM = 167 kg (6000 cc/kg)', '1 CBM = 1000 kg', '1 CBM = 333 kg', '1 CBM = 500 kg'],
          correctIndex: 0
        }
      ]
    }
  },
  {
    id: 'SEC-101',
    title: 'Cybersecurity & Information Security Awareness',
    category: 'Cybersecurity & InfoSec',
    level: 'Beginner',
    duration: '1.5 Hours',
    rating: 4.95,
    enrolledCount: 310,
    mandatoryFor: ['All Roles'],
    banner: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800',
    description: 'Mandatory annual digital security hygiene covering phishing prevention, password standards, email spoofing, and IT incident reporting.',
    passingScore: 85,
    modules: [
      {
        id: 'm1',
        title: 'Module 1: Cyber Threat Landscape in Freight Logistics',
        lessons: [
          { id: 'l1', title: '1.1 Why Logistics Companies are Cyber Targets', duration: '10 mins', type: 'video', assetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4' },
          { id: 'l2', title: '1.2 Password Hygiene & Multi-Factor Authentication', duration: '12 mins', type: 'video', assetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' }
        ]
      },
      {
        id: 'm2',
        title: 'Module 2: Phishing Defense & Incident Escalation',
        lessons: [
          { id: 'l3', title: '2.1 Spotting Fake Overseas Agent Invoice Emails', duration: '15 mins', type: 'video', assetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4' },
          { id: 'l4', title: '2.2 Fairmacs Cyber Incident Escalation Protocol SOP', duration: '4 pages', type: 'pdf', assetUrl: 'Fairmacs_InfoSec_SOP_2026.pdf' }
        ]
      }
    ],
    quiz: {
      id: 'q-sec-101',
      title: 'Mandatory Cybersecurity Annual Certification',
      timeLimitMinutes: 10,
      questions: [
        {
          id: 'q1',
          type: 'scenario',
          question: 'Scenario: You receive an urgent email claiming to be from an overseas agent requesting a bank account change for a freight payout. The email domain has a slight typo (@fairmacss.com). What action should you take?',
          options: [
            'Update the bank details immediately to prevent shipment delay',
            'Forward to a colleague to check',
            'Do not click any links; immediately notify IT Security and verify via known phone number',
            'Reply asking for secondary email confirmation'
          ],
          correctIndex: 2
        },
        {
          id: 'q2',
          type: 'mcq',
          question: 'Which of the following is the recommended practice for managing corporate passwords?',
          options: ['Write passwords on a sticky note under keyboard', 'Use a strong unique passphrase with MFA enabled', 'Use your birth year for easy memory', 'Share password with branch colleagues during shift handover'],
          correctIndex: 1
        }
      ]
    }
  },
  {
    id: 'CUS-301',
    title: 'Customs Clearance & Documentation Compliance',
    category: 'Customs & Compliance',
    level: 'Intermediate',
    duration: '3.0 Hours',
    rating: 4.85,
    enrolledCount: 115,
    mandatoryFor: ['Documentation', 'Operations'],
    banner: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800',
    description: 'Essential customs regulations, Shipping Bill and Bill of Entry processing, HSN code classification, and customs hold escalation procedures.',
    passingScore: 80,
    modules: [
      {
        id: 'm1',
        title: 'Module 1: Customs Fundamentals & HSN Code Tariffing',
        lessons: [
          { id: 'l1', title: '1.1 Principles of Customs Duties & Duty Structure', duration: '20 mins', type: 'video', assetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4' },
          { id: 'l2', title: '1.2 Commercial Invoice & Packing List Verification SOP', duration: '6 pages', type: 'pdf', assetUrl: 'Customs_Verification_SOP.pdf' }
        ]
      }
    ],
    quiz: {
      id: 'q-cus-301',
      title: 'Customs Compliance Quiz',
      timeLimitMinutes: 15,
      questions: [
        {
          id: 'q1',
          type: 'scenario',
          question: 'Scenario: An export shipment reaches the port gate, but the invoice description mismatches the Customs Shipping Bill. What is the correct protocol?',
          options: [
            'Proceed with gate-in and correct after ship departure',
            'Hold clearance, notify documentation lead, and issue an amended document as per SOP',
            'Cancel contract immediately',
            'Ignore if total invoice value matches'
          ],
          correctIndex: 1
        }
      ]
    }
  },
  {
    id: 'ORI-001',
    title: 'Fairmacs Company Induction & Code of Conduct',
    category: 'Company Orientation',
    level: 'Beginner',
    duration: '2.0 Hours',
    rating: 4.9,
    enrolledCount: 420,
    mandatoryFor: ['New Joiner', 'All Roles'],
    banner: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800',
    description: 'Welcome to Fairmacs! Learn about our organizational vision, workplace values, code of ethics, safety policies, and corporate history.',
    passingScore: 80,
    modules: [
      {
        id: 'm1',
        title: 'Module 1: Corporate Vision & Core Values',
        lessons: [
          { id: 'l1', title: '1.1 Welcome to Fairmacs - CEO Address', duration: '10 mins', type: 'video', assetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
          { id: 'l2', title: '1.2 Corporate Code of Conduct & Workplace Rights SOP', duration: '12 pages', type: 'pdf', assetUrl: 'Fairmacs_Code_of_Conduct.pdf' }
        ]
      }
    ],
    quiz: {
      id: 'q-ori-001',
      title: 'Company Induction Evaluation',
      timeLimitMinutes: 10,
      questions: [
        {
          id: 'q1',
          type: 'true_false',
          question: 'True or False: All employees are required to adhere strictly to the Fairmacs Ethical Business Code in all customer and vendor interactions.',
          options: ['True', 'False'],
          correctIndex: 0
        }
      ]
    }
  },
  {
    id: 'DGA-401',
    title: 'Dangerous Goods (DG) General Awareness',
    category: 'Safety & Dangerous Goods Awareness',
    level: 'Intermediate',
    duration: '2.5 Hours',
    rating: 4.75,
    enrolledCount: 88,
    mandatoryFor: ['Operations'],
    banner: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=800',
    description: 'General safety awareness for hazardous materials handling, UN classification labels, safety data sheets (SDS), and emergency procedures.',
    passingScore: 85,
    modules: [
      {
        id: 'm1',
        title: 'Module 1: UN Classification of Dangerous Goods',
        lessons: [
          { id: 'l1', title: '1.1 The 9 Classes of Dangerous Cargo Overview', duration: '22 mins', type: 'video', assetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
          { id: 'l2', title: '1.2 Hazard Labeling & Handling SOP', duration: '8 pages', type: 'pdf', assetUrl: 'DG_Handling_Guide.pdf' }
        ]
      }
    ],
    quiz: {
      id: 'q-dga-401',
      title: 'Dangerous Goods Awareness Check',
      timeLimitMinutes: 15,
      questions: [
        {
          id: 'q1',
          type: 'mcq',
          question: 'Under UN Hazard Classification, Class 3 represents which category of dangerous goods?',
          options: ['Explosives', 'Flammable Liquids', 'Toxic Substances', 'Radioactive Material'],
          correctIndex: 1
        }
      ]
    }
  },
  {
    id: 'CSV-202',
    title: 'Logistics Customer Service & Communication SOP',
    category: 'Customer Service & CS Quality',
    level: 'Beginner',
    duration: '2.0 Hours',
    rating: 4.88,
    enrolledCount: 165,
    mandatoryFor: ['Customer Service', 'Sales'],
    banner: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=800',
    description: 'Master professional client communication, email etiquette, proactive shipment status tracking, and SLA escalation protocols.',
    passingScore: 80,
    modules: [
      {
        id: 'm1',
        title: 'Module 1: Client Communication Standards',
        lessons: [
          { id: 'l1', title: '1.1 Professional Email Etiquette in Logistics', duration: '14 mins', type: 'video', assetUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' }
        ]
      }
    ],
    quiz: {
      id: 'q-csv-202',
      title: 'Customer Service Quality Check',
      timeLimitMinutes: 10,
      questions: [
        {
          id: 'q1',
          type: 'true_false',
          question: 'True or False: Proactive status updates should be sent to clients before they query delayed shipments whenever possible.',
          options: ['True', 'False'],
          correctIndex: 0
        }
      ]
    }
  }
];

export const ROLE_LEARNING_PATHS = [
  { role: 'New Joiner (All)', mandatory: ['ORI-001', 'SEC-101'], recommended: ['LFF-101'], advanced: [] },
  { role: 'Operations', mandatory: ['LFF-101', 'AFO-201', 'DGA-401'], recommended: ['CUS-301', 'SEC-101'], advanced: ['Specialized Dangerous Goods Certification'] },
  { role: 'Sales', mandatory: ['LFF-101', 'CSV-202'], recommended: ['AFO-201', 'SEC-101'], advanced: ['Key Account Consultative Selling'] },
  { role: 'Customer Service', mandatory: ['CSV-202', 'LFF-101'], recommended: ['SEC-101', 'CUS-301'], advanced: ['Advanced Conflict Management'] },
  { role: 'Documentation', mandatory: ['CUS-301', 'AFO-201'], recommended: ['LFF-101', 'SEC-101'], advanced: ['Regulatory Tariff Classification'] },
  { role: 'HR & Training', mandatory: ['ORI-001', 'SEC-101'], recommended: ['CSV-202'], advanced: ['Strategic L&D Analytics'] },
  { role: 'Finance', mandatory: ['ORI-001', 'SEC-101', 'CUS-301'], recommended: ['LFF-101'], advanced: ['Logistics Freight Audit & Cost Control'] },
  { role: 'IT & Systems', mandatory: ['SEC-101', 'ORI-001'], recommended: ['LFF-101'], advanced: ['Cloud Security & Threat Governance'] },
  { role: 'Manager / Branch Lead', mandatory: ['ORI-001', 'SEC-101', 'DGA-401'], recommended: ['LFF-101'], advanced: ['Strategic Supply Chain Leadership'] }
];

export const MOCK_USER_PROGRESS = {
  EMP1001: {
    'LFF-101': { status: 'In Progress', progressPercent: 65, completedLessons: ['l1', 'l2'], lastAccessed: '2026-09-18' },
    'SEC-101': { status: 'Completed', progressPercent: 100, completedLessons: ['l1', 'l2', 'l3', 'l4'], score: 90, certId: 'CERT-FMC-2026-89412', completedDate: '2026-09-10' },
    'ORI-001': { status: 'Completed', progressPercent: 100, completedLessons: ['l1', 'l2'], score: 100, certId: 'CERT-FMC-2026-77210', completedDate: '2026-09-02' }
  }
};

export const MOCK_TEAM_MEMBERS = [
  { id: 'EMP1001', name: 'Arjun Kumar', designation: 'Air Cargo Specialist', department: 'Operations', assigned: 4, completed: 3, complianceStatus: 'Compliant', overdue: 0 },
  { id: 'EMP1002', name: 'Kavita Sharma', designation: 'Documentation Executive', department: 'Documentation', assigned: 5, completed: 4, complianceStatus: 'Compliant', overdue: 0 },
  { id: 'EMP1003', name: 'Siddharth Rao', designation: 'Operations Trainee', department: 'Operations', assigned: 3, completed: 1, complianceStatus: 'Pending Action', overdue: 1 },
  { id: 'EMP1004', name: 'Deepa Nair', designation: 'Customer Service Executive', department: 'Customer Service', assigned: 4, completed: 2, complianceStatus: 'Overdue Warning', overdue: 1 }
];

export const MOCK_HR_METRICS = {
  totalEmployees: 450,
  activeLearners: 398,
  overallCompletionRate: 84.5,
  avgTrainingHours: 14.2,
  mandatoryComplianceRate: 92.0,
  certificatesIssued: 1120,
  departmentStats: [
    { department: 'Operations', total: 160, completed: 142, rate: 88.7 },
    { department: 'Documentation', total: 85, completed: 78, rate: 91.7 },
    { department: 'Sales & BD', total: 70, completed: 55, rate: 78.5 },
    { department: 'Customer Service', total: 60, completed: 52, rate: 86.6 },
    { department: 'Finance & HR', total: 45, completed: 44, rate: 97.7 },
    { department: 'IT & Security', total: 30, completed: 30, rate: 100.0 }
  ]
};

export const MOCK_AUDIT_LOGS = [
  { id: 'log-1', timestamp: '2026-09-21 10:32:10', user: 'Arjun Kumar (EMP1001)', action: 'Completed Lesson 1.2 in Freight Forwarding Fundamentals', ip: '192.168.1.45' },
  { id: 'log-2', timestamp: '2026-09-21 09:15:04', user: 'Priya Nair (TRN1001)', action: 'Updated Quiz Bank for Course AFO-201', ip: '192.168.1.12' },
  { id: 'log-3', timestamp: '2026-09-20 16:45:22', user: 'Admin User (HR1001)', action: 'Assigned SEC-101 Mandatory Refresher to Operations Dept', ip: '192.168.1.02' },
  { id: 'log-4', timestamp: '2026-09-20 09:20:11', user: 'Rahul Menon (MGR1001)', action: 'Generated Team Compliance Summary Report', ip: '192.168.2.88' }
];

export const MOCK_LEARNING_PATHS = [
  {
    id: 'lp-doc',
    title: 'Documentation Essentials',
    department: 'Documentation',
    courseCount: 6,
    type: 'Mandatory',
    description: 'Mandatory documentation verification, shipping bills, commercial invoices, and customs tariffing SOPs.',
    courseIds: ['CUS-301', 'AFO-201', 'SEC-101', 'LFF-101']
  },
  {
    id: 'lp-acc',
    title: 'Accounts Essentials',
    department: 'Accounts',
    courseCount: 5,
    type: 'Mandatory',
    description: 'Corporate financial compliance, freight tariff auditing, InfoSec awareness, and billing standards.',
    courseIds: ['SEC-101', 'CUS-301', 'LFF-101']
  },
  {
    id: 'lp-ops',
    title: 'Operations Fundamentals',
    department: 'Operations',
    courseCount: 8,
    type: 'Mandatory',
    description: 'End-to-end freight forwarding execution, air/sea cargo SOPs, and UN dangerous goods safety standards.',
    courseIds: ['LFF-101', 'AFO-201', 'SEA-202', 'DGA-401', 'SEC-101']
  },
  {
    id: 'lp-sal',
    title: 'Sales Excellence',
    department: 'Sales',
    courseCount: 6,
    type: 'Recommended',
    description: 'Freight forwarding key account management, consultative selling, client SLA compliance, and communication.',
    courseIds: ['LFF-101', 'CSV-202', 'AFO-201']
  },
  {
    id: 'lp-onb',
    title: 'New Employee Onboarding',
    department: 'All Departments',
    courseCount: 4,
    type: 'Mandatory',
    description: 'Fairmacs corporate history, code of conduct, ethics code, and employee rights induction track.',
    courseIds: ['ORI-001', 'SEC-101']
  },
  {
    id: 'lp-sec',
    title: 'Cybersecurity Awareness',
    department: 'All Departments',
    courseCount: 1,
    type: 'Mandatory',
    description: 'Annual digital security hygiene, anti-phishing defense, email spoofing prevention, and IT incident escalation.',
    courseIds: ['SEC-101']
  }
];

export const MOCK_CALENDAR_EVENTS = [
  {
    id: 'cal-1',
    date: '2026-09-23',
    dayNumber: '23',
    title: 'Air Freight Operations Live Clinic',
    time: '02:00 PM - 03:30 PM',
    trainer: 'Priya Nair (Instructor)',
    department: 'Operations & Documentation',
    location: 'Chennai HQ Training Room A / Teams Link',
    type: 'Live Workshop'
  },
  {
    id: 'cal-2',
    date: '2026-09-25',
    dayNumber: '25',
    title: 'Documentation & Customs Tariffing Workshop',
    time: '11:00 AM - 01:00 PM',
    trainer: 'Kavita Sharma',
    department: 'Documentation',
    location: 'Corporate HQ Conference Room B',
    type: 'Workshop'
  },
  {
    id: 'cal-3',
    date: '2026-09-28',
    dayNumber: '28',
    title: 'Cybersecurity Annual Assessment Deadline',
    time: '11:59 PM Deadline',
    trainer: 'IT Security Team',
    department: 'All Departments',
    location: 'KMS Online Portal',
    type: 'Assessment'
  },
  {
    id: 'cal-4',
    date: '2026-09-30',
    dayNumber: '30',
    title: 'Quarterly Compliance Refresher Deadline',
    time: '11:59 PM Deadline',
    trainer: 'HR & Compliance Dept',
    department: 'Operations',
    location: 'KMS Online Portal',
    type: 'Deadline'
  }
];

export const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'New Course Assigned',
    message: 'Import & Export Documentation (CUS-301) has been assigned to your department.',
    time: '10 mins ago',
    type: 'assignment',
    read: false
  },
  {
    id: 'notif-2',
    title: 'Training Due Soon',
    message: 'Cybersecurity Awareness (SEC-101) annual assessment is due in 3 days.',
    time: '2 hours ago',
    type: 'warning',
    read: false
  },
  {
    id: 'notif-3',
    title: 'Course Completed',
    message: 'You successfully completed Freight Forwarding Fundamentals with 92% score.',
    time: '1 day ago',
    type: 'success',
    read: false
  },
  {
    id: 'notif-4',
    title: 'Certificate Available',
    message: 'Your official digital certificate FM-CERT-00142 is ready to download.',
    time: '2 days ago',
    type: 'certificate',
    read: true
  }
];
