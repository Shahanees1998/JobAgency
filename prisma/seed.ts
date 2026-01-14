import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🧹 Clearing existing data...');
  await prisma.message.deleteMany();
  await prisma.chatParticipant.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.application.deleteMany();
  await prisma.job.deleteMany();
  await prisma.employer.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.adminLog.deleteMany();
  await prisma.adminEscalation.deleteMany();
  await prisma.supportRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.user.deleteMany();

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Admin User (keep existing admin)
  const adminUser = await prisma.user.upsert({
    where: { email: 'shahanees@yopmail.com' },
    update: {},
    create: {
      email: 'shahanees@yopmail.com',
      password: hashedPassword,
      firstName: 'Anees',
      lastName: 'Shah',
      phone: '03039230696',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
      isPasswordChanged: true,
    },
  });
  console.log('✅ Created admin user:', adminUser.email);

  // Create Additional Admin Users
  const adminUsers = [];
  for (let i = 1; i <= 2; i++) {
    const admin = await prisma.user.create({
      data: {
        email: `admin${i}@example.com`,
        password: hashedPassword,
        firstName: `Admin${i}`,
        lastName: 'User',
        phone: `0300123456${i}`,
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
        isPasswordChanged: true,
      },
    });
    adminUsers.push(admin);
  }
  console.log(`✅ Created ${adminUsers.length} additional admin users`);

  // Create Employer Users
  const employerUsers = [];
  const industries = ['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing'];
  const companySizes = ['1-10', '11-50', '51-200', '201-500', '500+'];

  for (let i = 1; i <= 10; i++) {
    const status = i <= 3 ? 'ACTIVE' : i <= 6 ? 'PENDING' : 'ACTIVE';
    const employer = await prisma.user.create({
      data: {
        email: `employer${i}@example.com`,
        password: hashedPassword,
        firstName: `Employer${i}`,
        lastName: 'Company',
        phone: `0300123457${i}`,
        role: 'EMPLOYER',
        status: status,
        emailVerified: i <= 7,
        phoneVerified: i <= 7,
        isPasswordChanged: true,
      },
    });
    employerUsers.push(employer);

    // Create Employer Profile
    const verificationStatus = i <= 3 ? 'APPROVED' : i <= 6 ? 'PENDING' : 'APPROVED';
    await prisma.employer.create({
      data: {
        userId: employer.id,
        companyName: `${employer.firstName} Corp`,
        companyDescription: `Leading company in ${industries[i % industries.length]} industry`,
        companyWebsite: `https://company${i}.com`,
        industry: industries[i % industries.length],
        companySize: companySizes[i % companySizes.length],
        address: `${i * 100} Main Street`,
        city: ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Multan'][i % 5],
        country: 'Pakistan',
        verificationStatus: verificationStatus,
        verifiedAt: verificationStatus === 'APPROVED' ? new Date() : null,
        verifiedById: verificationStatus === 'APPROVED' ? adminUser.id : null,
        isSuspended: i === 10,
      },
    });
  }
  console.log(`✅ Created ${employerUsers.length} employer users with profiles`);

  // Create Candidate Users
  const candidateUsers = [];
  const skills = [
    ['JavaScript', 'React', 'Node.js'],
    ['Python', 'Django', 'PostgreSQL'],
    ['Java', 'Spring Boot', 'MySQL'],
    ['C#', '.NET', 'SQL Server'],
    ['PHP', 'Laravel', 'MySQL'],
    ['Ruby', 'Rails', 'PostgreSQL'],
    ['Go', 'Docker', 'Kubernetes'],
    ['Swift', 'iOS', 'Xcode'],
    ['Kotlin', 'Android', 'Firebase'],
    ['TypeScript', 'Angular', 'MongoDB'],
  ];

  for (let i = 1; i <= 15; i++) {
    const candidate = await prisma.user.create({
      data: {
        email: `candidate${i}@example.com`,
        password: hashedPassword,
        firstName: `Candidate${i}`,
        lastName: 'Developer',
        phone: `0300123458${i}`,
        role: 'CANDIDATE',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: true,
        isPasswordChanged: true,
      },
    });
    candidateUsers.push(candidate);

    // Create Candidate Profile
    await prisma.candidate.create({
      data: {
        userId: candidate.id,
        bio: `Experienced ${skills[i % skills.length][0]} developer with ${i + 2} years of experience`,
        skills: skills[i % skills.length],
        experience: `${i + 2} years`,
        education: `Bachelor's in Computer Science`,
        location: ['Lahore', 'Karachi', 'Islamabad'][i % 3],
        availability: i % 2 === 0 ? 'Immediate' : '2 weeks notice',
        expectedSalary: `$${(i + 3) * 10}k - $${(i + 4) * 10}k`,
        isProfileComplete: i <= 10,
      },
    });
  }
  console.log(`✅ Created ${candidateUsers.length} candidate users with profiles`);

  // Create Jobs
  const jobTitles = [
    'Senior Software Engineer',
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'DevOps Engineer',
    'Mobile App Developer',
    'Data Scientist',
    'UI/UX Designer',
    'Product Manager',
    'QA Engineer',
    'System Administrator',
    'Cloud Architect',
    'Security Engineer',
    'Technical Lead',
    'Software Architect',
  ];

  const employmentTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'FREELANCE'];
  const jobStatuses = ['APPROVED', 'PENDING', 'APPROVED', 'APPROVED', 'REJECTED'];

  const jobs = [];
  for (let i = 0; i < employerUsers.length; i++) {
    const employer = employerUsers[i];
    const employerProfile = await prisma.employer.findUnique({
      where: { userId: employer.id },
    });

    if (!employerProfile) continue;

    for (let j = 0; j < 3; j++) {
      const jobIndex = i * 3 + j;
      const status = jobStatuses[jobIndex % jobStatuses.length];
      const job = await prisma.job.create({
        data: {
          employerId: employerProfile.id,
          title: jobTitles[jobIndex % jobTitles.length],
          description: `We are looking for an experienced ${jobTitles[jobIndex % jobTitles.length]} to join our team. This is a great opportunity to work on cutting-edge projects.`,
          requirements: `• ${j + 3} years of experience\n• Strong problem-solving skills\n• Excellent communication skills\n• Bachelor's degree in related field`,
          responsibilities: `• Develop and maintain software applications\n• Collaborate with cross-functional teams\n• Write clean, maintainable code\n• Participate in code reviews`,
          location: employerProfile.city || 'Remote',
          salaryRange: `$${(jobIndex + 5) * 10}k - $${(jobIndex + 7) * 10}k`,
          employmentType: employmentTypes[jobIndex % employmentTypes.length] as any,
          category: employerProfile.industry || 'Technology',
          status: status as any,
          moderatedAt: status === 'APPROVED' ? new Date() : null,
          moderatedById: status === 'APPROVED' ? adminUser.id : null,
          views: Math.floor(Math.random() * 500),
          applicationCount: 0,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
      });
      jobs.push(job);
    }
  }
  console.log(`✅ Created ${jobs.length} jobs`);

  // Create Applications
  const applications = [];
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    if (job.status !== 'APPROVED') continue;

    // Each approved job gets 2-5 applications
    const numApplications = Math.floor(Math.random() * 4) + 2;
    const shuffledCandidates = candidateUsers.sort(() => 0.5 - Math.random());

    for (let j = 0; j < Math.min(numApplications, shuffledCandidates.length); j++) {
      const candidate = shuffledCandidates[j];
      const candidateProfile = await prisma.candidate.findUnique({
        where: { userId: candidate.id },
      });

      if (!candidateProfile) continue;

      const statuses = ['APPLIED', 'REVIEWING', 'APPROVED', 'REJECTED'];
      const status = statuses[j % statuses.length] as any;

      const application = await prisma.application.create({
        data: {
          jobId: job.id,
          candidateId: candidateProfile.id,
          status: status,
          coverLetter: `Dear Hiring Manager,\n\nI am writing to express my interest in the ${job.title} position. I believe my skills and experience make me a strong candidate for this role.\n\nBest regards,\n${candidate.firstName} ${candidate.lastName}`,
          reviewedAt: status === 'APPROVED' || status === 'REJECTED' ? new Date() : null,
          reviewedById: status === 'APPROVED' || status === 'REJECTED' ? employerUsers[0].id : null,
          interviewScheduled: status === 'APPROVED',
          interviewDate: status === 'APPROVED' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
          interviewLocation: status === 'APPROVED' ? 'Office Building, Main Street' : null,
        },
      });
      applications.push(application);

      // Update job application count
      await prisma.job.update({
        where: { id: job.id },
        data: { applicationCount: { increment: 1 } },
      });
    }
  }
  console.log(`✅ Created ${applications.length} applications`);

  // Create Chats for approved applications
  const chats = [];
  for (const application of applications) {
    if (application.status === 'APPROVED' && application.interviewScheduled) {
      const chat = await prisma.chat.create({
        data: {
          applicationId: application.id,
          isActive: true,
          lastMessageAt: new Date(),
        },
      });
      chats.push(chat);

      // Create chat participants
      const job = await prisma.job.findUnique({
        where: { id: application.jobId },
        include: { employer: { include: { user: true } } },
      });

      const candidate = await prisma.candidate.findUnique({
        where: { id: application.candidateId },
      });

      if (job && candidate) {
        // Add employer to chat
        await prisma.chatParticipant.create({
          data: {
            chatId: chat.id,
            userId: job.employer.userId,
            employerId: job.employer.id,
          },
        });

        // Add candidate to chat
        await prisma.chatParticipant.create({
          data: {
            chatId: chat.id,
            userId: candidate.userId,
            candidateId: candidate.id,
          },
        });

        // Create some messages
        const messages = [
          { sender: job.employer.userId, content: 'Thank you for your application. We would like to schedule an interview.' },
          { sender: candidate.userId, content: 'Thank you! I am available for an interview.' },
          { sender: job.employer.userId, content: 'Great! The interview is scheduled as discussed.' },
        ];

        for (const msg of messages) {
          await prisma.message.create({
            data: {
              chatId: chat.id,
              senderId: msg.sender,
              content: msg.content,
              messageType: 'TEXT',
            },
          });
        }
      }
    }
  }
  console.log(`✅ Created ${chats.length} chats with messages`);

  // Create Notifications
  const notifications = [];
  for (let i = 0; i < 20; i++) {
    const user = [...adminUsers, ...employerUsers, ...candidateUsers][i % (adminUsers.length + employerUsers.length + candidateUsers.length)];
    const types = ['NEW_JOB_POSTING', 'JOB_APPROVED', 'APPLICATION_RECEIVED', 'NEW_CHAT_MESSAGE', 'SYSTEM_ALERT'];
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        title: `Notification ${i + 1}`,
        message: `This is a test notification message ${i + 1}`,
        type: types[i % types.length] as any,
        isRead: i % 3 === 0,
        relatedId: i % 2 === 0 ? jobs[i % jobs.length]?.id : undefined,
        relatedType: i % 2 === 0 ? 'JOB' : undefined,
      },
    });
    notifications.push(notification);
  }
  console.log(`✅ Created ${notifications.length} notifications`);

  // Create Support Requests
  const supportRequests = [];
  for (let i = 0; i < 8; i++) {
    const user = [...employerUsers, ...candidateUsers][i % (employerUsers.length + candidateUsers.length)];
    const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    const request = await prisma.supportRequest.create({
      data: {
        userId: user.id,
        subject: `Support Request ${i + 1}`,
        message: `I need help with issue ${i + 1}. Please assist me.`,
        status: statuses[i % statuses.length] as any,
        priority: priorities[i % priorities.length] as any,
        adminResponse: i > 4 ? 'This issue has been resolved. Thank you for your patience.' : null,
      },
    });
    supportRequests.push(request);
  }
  console.log(`✅ Created ${supportRequests.length} support requests`);

  // Create Announcements
  const announcements = [];
  const announcementTypes = ['GENERAL', 'IMPORTANT', 'URGENT', 'EVENT', 'UPDATE'];
  for (let i = 0; i < 5; i++) {
    const announcement = await prisma.announcement.create({
      data: {
        title: `Announcement ${i + 1}`,
        content: `This is announcement content ${i + 1}. Important information for all users.`,
        type: announcementTypes[i % announcementTypes.length] as any,
        status: 'PUBLISHED',
        createdById: adminUser.id,
      },
    });
    announcements.push(announcement);
  }
  console.log(`✅ Created ${announcements.length} announcements`);

  // Create Admin Escalations
  const escalations = [];
  for (let i = 0; i < 5; i++) {
    const user = [...employerUsers, ...candidateUsers][i % (employerUsers.length + candidateUsers.length)];
    const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    const escalation = await prisma.adminEscalation.create({
      data: {
        userId: user.id,
        subject: `Escalation ${i + 1}`,
        message: `This is an escalation request ${i + 1}. Requires admin attention.`,
        status: statuses[i % statuses.length] as any,
        priority: i % 2 === 0 ? 'HIGH' : 'MEDIUM',
        adminResponse: i > 2 ? 'This escalation has been handled. Thank you.' : null,
      },
    });
    escalations.push(escalation);
  }
  console.log(`✅ Created ${escalations.length} admin escalations`);

  // Create Admin Logs
  const adminLogs = [];
  const actions = ['EMPLOYER_APPROVED', 'JOB_APPROVED', 'APPLICATION_VIEWED', 'USER_SUSPENDED', 'CONTENT_MODERATED'];
  for (let i = 0; i < 15; i++) {
    const log = await prisma.adminLog.create({
      data: {
        adminId: adminUser.id,
        action: actions[i % actions.length] as any,
        entityType: i % 2 === 0 ? 'EMPLOYER' : 'JOB',
        entityId: i % 2 === 0 ? employerUsers[i % employerUsers.length].id : jobs[i % jobs.length].id,
        description: `Admin action: ${actions[i % actions.length]} performed`,
        metadata: JSON.stringify({ timestamp: new Date().toISOString() }),
        ipAddress: `192.168.1.${i + 1}`,
        userAgent: 'Mozilla/5.0 (Test Browser)',
      },
    });
    adminLogs.push(log);
  }
  console.log(`✅ Created ${adminLogs.length} admin logs`);

  // Create System Settings (if not exists)
  const settings = await prisma.systemSettings.findFirst();
  if (!settings) {
    await prisma.systemSettings.create({
      data: {
        siteName: 'Job Portal',
        siteDescription: 'A comprehensive job portal platform',
        contactEmail: 'admin@jobportal.com',
        enableNotifications: true,
      },
    });
    console.log('✅ Created system settings');
  } else {
    console.log('ℹ️ System settings already exist');
  }

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Admin Users: ${1 + adminUsers.length}`);
  console.log(`   - Employer Users: ${employerUsers.length}`);
  console.log(`   - Candidate Users: ${candidateUsers.length}`);
  console.log(`   - Jobs: ${jobs.length}`);
  console.log(`   - Applications: ${applications.length}`);
  console.log(`   - Chats: ${chats.length}`);
  console.log(`   - Notifications: ${notifications.length}`);
  console.log(`   - Support Requests: ${supportRequests.length}`);
  console.log(`   - Announcements: ${announcements.length}`);
  console.log(`   - Escalations: ${escalations.length}`);
  console.log(`   - Admin Logs: ${adminLogs.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

