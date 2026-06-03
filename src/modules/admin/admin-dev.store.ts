import { UserRole, VerificationStatus, BookingStatus, BroadcastAudience } from '@prisma/client';

/** In-memory admin data when PostgreSQL is unavailable (local dev). */
export class AdminDevStore {
  private static instance: AdminDevStore;

  static getInstance() {
    if (!this.instance) this.instance = new AdminDevStore();
    return this.instance;
  }

  readonly adminUser = {
    id: 'dev-admin-1',
    email: 'admin@liftoo.in',
    phone: '9000000001',
    name: 'Liftoo Admin',
    roles: [UserRole.admin],
    activeRole: UserRole.admin,
  };

  users = [
    {
      id: 'u1',
      name: 'Rahul Sharma',
      phone: '9876543210',
      email: null,
      roles: [UserRole.customer] as UserRole[],
      activeRole: UserRole.customer,
      isSuspended: false,
      walletBalance: 1000,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'u2',
      name: 'Priya Patel',
      phone: '9876543211',
      email: null,
      roles: [UserRole.assistant] as UserRole[],
      activeRole: UserRole.assistant,
      isSuspended: false,
      walletBalance: 450,
      rating: 4.8,
      totalJobs: 42,
      isOnline: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'u3',
      name: 'Amit Kumar',
      phone: '9876543212',
      email: null,
      roles: [UserRole.assistant] as UserRole[],
      activeRole: UserRole.assistant,
      isSuspended: false,
      walletBalance: 200,
      rating: 4.6,
      totalJobs: 28,
      isOnline: false,
      createdAt: new Date().toISOString(),
    },
  ];

  bookings = [
    {
      id: 'bk-demo-1',
      status: BookingStatus.arriving,
      venueName: 'Phoenix Mall',
      totalAmount: 330,
      scheduledAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      category: { name: 'Bag Carry Assistance' },
      customer: { name: 'Rahul Sharma', phone: '9876543210' },
      assistant: { name: 'Priya Patel', phone: '9876543211' },
      payment: null,
    },
    {
      id: 'bk-demo-2',
      status: BookingStatus.completed,
      venueName: 'Inorbit Mall',
      totalAmount: 275,
      scheduledAt: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      category: { name: 'Queue Assistance' },
      customer: { name: 'Rahul Sharma', phone: '9876543210' },
      assistant: { name: 'Amit Kumar', phone: '9876543212' },
      payment: { method: 'wallet', status: 'completed', amount: 275 },
    },
  ];

  categories = [
    { id: 'c1', slug: 'bag_carry', name: 'Bag Carry Assistance', baseRate: 150, isActive: true, icon: 'shopping_bag' },
    { id: 'c2', slug: 'queue', name: 'Queue Assistance', baseRate: 120, isActive: true, icon: 'groups' },
    { id: 'c3', slug: 'family', name: 'Family Shopping Help', baseRate: 200, isActive: true, icon: 'family_restroom' },
  ];

  cities = [
    { id: 'city1', name: 'Mumbai', state: 'Maharashtra', isActive: true },
    { id: 'city2', name: 'Pune', state: 'Maharashtra', isActive: true },
  ];

  verifications = [
    {
      userId: 'u3',
      user: { id: 'u3', name: 'Amit Kumar', phone: '9876543212' },
      pendingCount: 2,
      documents: [
        { type: 'aadhaar', status: VerificationStatus.pending, fileUrl: 'https://example.com/aadhaar.jpg' },
        { type: 'selfie', status: VerificationStatus.pending, fileUrl: 'https://example.com/selfie.jpg' },
      ],
    },
  ];

  verificationDetails: Record<string, { documents: unknown[]; summary: unknown }> = {
    u3: {
      documents: [
        { type: 'profile_photo', label: 'Profile photo', status: VerificationStatus.verified, fileUrl: null },
        { type: 'aadhaar', label: 'Aadhaar', status: VerificationStatus.pending, fileUrl: 'https://example.com/aadhaar.jpg' },
        { type: 'selfie', label: 'Selfie', status: VerificationStatus.pending, fileUrl: 'https://example.com/selfie.jpg' },
      ],
      summary: { completionPercent: 45, fullyVerified: false, pendingCount: 2 },
    },
  };

  payments = [
    {
      id: 'pay1',
      method: 'wallet',
      amount: 275,
      status: 'completed',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      booking: this.bookings[1],
    },
  ];

  earnings = [
    {
      id: 'e1',
      amount: 220,
      description: 'Booking bk-demo-2',
      isPaidOut: false,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      assistant: { name: 'Amit Kumar', phone: '9876543212' },
    },
  ];

  ratings = [
    {
      id: 'r1',
      stars: 5,
      comment: 'Very helpful assistant!',
      createdAt: new Date().toISOString(),
      customer: { name: 'Rahul Sharma', phone: '9876543210' },
      assistant: { name: 'Priya Patel', phone: '9876543211' },
      booking: { venueName: 'Phoenix Mall', category: { name: 'Bag Carry' } },
    },
  ];

  appReviews = [
    {
      id: 'ar1',
      stars: 5,
      comment: 'Great app experience',
      platform: 'android',
      createdAt: new Date().toISOString(),
      user: { name: 'Rahul Sharma', phone: '9876543210' },
    },
  ];

  broadcasts: {
    id: string;
    adminId: string;
    audience: BroadcastAudience;
    title: string;
    body: string;
    sentCount: number;
    failCount: number;
    createdAt: string;
  }[] = [];

  referrals = [
    {
      id: 'ref1',
      code: 'LIFRAHUL',
      rewardAmount: 100,
      status: 'completed',
      createdAt: new Date().toISOString(),
      referrer: { name: 'Rahul Sharma', phone: '9876543210', referralCode: 'LIFRAHUL' },
      referee: { name: 'Guest User', phone: '9999999999' },
    },
  ];

  devLogin(email: string, password: string) {
    const devEmail = process.env.ADMIN_DEV_EMAIL ?? 'admin@liftoo.in';
    const devPass = process.env.ADMIN_DEV_PASSWORD ?? 'admin123';
    if (email.toLowerCase() !== devEmail || password !== devPass) {
      return null;
    }
    return this.adminUser;
  }
}
