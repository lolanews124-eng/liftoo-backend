import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/common/utils/password.util';

const prisma = new PrismaClient();

async function main() {
  await prisma.platformSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      matchRadiusKm: 15,
      signupWalletBonus: 500,
      referralRewardAmount: 100,
      assistantEarningPercent: 80,
      matchBatchSize: 3,
      platformFeePercent: 10,
      bookingSearchTimeoutMin: 15,
      assistantCodeYear: 2026,
      assistantCodeSeq: 2,
    },
  });

  const city = await prisma.city.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Mumbai',
      state: 'Maharashtra',
    },
  });

  const categories = [
    { slug: 'bag_carry', name: 'Bag Carry Assistance', baseRate: 150, icon: 'shopping_bag' },
    { slug: 'queue', name: 'Queue Assistance', baseRate: 120, icon: 'groups' },
    { slug: 'family', name: 'Family Shopping Help', baseRate: 200, icon: 'family_restroom' },
    { slug: 'senior', name: 'Senior Citizen Help', baseRate: 180, icon: 'elderly' },
    { slug: 'festival', name: 'Festival Shopping Support', baseRate: 250, icon: 'celebration' },
  ];

  for (const cat of categories) {
    await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
  }

  const customerPhone = '9876543210';
  const assistant1Phone = '9876543211';
  const assistant2Phone = '9876543212';

  const customer = await prisma.user.upsert({
    where: { email: 'demo@liftoo.in' },
    update: {
      passwordHash: hashPassword('demo123'),
      emailVerified: true,
      phone: customerPhone,
    },
    create: {
      email: 'demo@liftoo.in',
      passwordHash: hashPassword('demo123'),
      emailVerified: true,
      phone: customerPhone,
      name: 'Rahul Sharma',
      roles: [UserRole.customer],
      activeRole: UserRole.customer,
      referralCode: 'LIFRAHUL',
    },
  });

  await prisma.customerProfile.upsert({
    where: { userId: customer.id },
    update: {},
    create: { userId: customer.id },
  });

  await prisma.wallet.upsert({
    where: { userId: customer.id },
    update: { balance: 1000 },
    create: { userId: customer.id, balance: 1000 },
  });

  for (const [phone, name, code, assistantCode] of [
    [assistant1Phone, 'Priya Patel', 'LIFPRIYA', 'Liftoo-2026-0001'],
    [assistant2Phone, 'Amit Kumar', 'LIFAMIT', 'Liftoo-2026-0002'],
  ] as const) {
    const assistant = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: {
        phone,
        name,
        roles: [UserRole.assistant],
        activeRole: UserRole.assistant,
        referralCode: code,
      },
    });

    await prisma.assistantProfile.upsert({
      where: { userId: assistant.id },
      update: {
        assistantCode,
        adminVerified: true,
        adminVerifiedAt: new Date(),
      },
      create: {
        userId: assistant.id,
        assistantCode,
        adminVerified: true,
        adminVerifiedAt: new Date(),
        rating: 4.8,
        totalJobs: 42,
        aadhaarVerified: true,
        selfieVerified: true,
        bankVerified: true,
      },
    });

    await prisma.assistantAvailability.upsert({
      where: { userId: assistant.id },
      update: { isOnline: true, lastLat: 19.076, lastLng: 72.8777 },
      create: {
        userId: assistant.id,
        isOnline: true,
        lastLat: 19.076,
        lastLng: 72.8777,
      },
    });

    await prisma.wallet.upsert({
      where: { userId: assistant.id },
      update: {},
      create: { userId: assistant.id, balance: 0 },
    });
  }

  await prisma.address.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      userId: customer.id,
      label: 'Home',
      formattedAddress: 'Phoenix Mall, Lower Parel, Mumbai',
      lat: 19.017,
      lng: 72.830,
      isDefault: true,
    },
  });

  await prisma.user.upsert({
    where: { phone: '9000000001' },
    update: {
      email: 'admin@liftoo.in',
      passwordHash: hashPassword('admin123'),
      name: 'Liftoo Admin',
      roles: [UserRole.admin],
      activeRole: UserRole.admin,
    },
    create: {
      phone: '9000000001',
      email: 'admin@liftoo.in',
      passwordHash: hashPassword('admin123'),
      name: 'Liftoo Admin',
      roles: [UserRole.admin],
      activeRole: UserRole.admin,
    },
  });

  console.log('Seed completed');
  console.log('Demo customer login (email OTP: 123456 in dev):');
  console.log('  Email: demo@liftoo.in');
  console.log('  Password: demo123');
  console.log(`  Legacy phones (assistants): ${assistant1Phone}, ${assistant2Phone}`);
  console.log(`  City: ${city.name}`);
  console.log('Admin panel login:');
  console.log('  Email: admin@liftoo.in');
  console.log('  Password: admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
