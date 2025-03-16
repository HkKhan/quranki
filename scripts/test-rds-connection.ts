const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    console.log('Testing RDS connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Successfully connected to RDS');

    // Test query execution
    const userCount = await prisma.user.count();
    console.log('✅ Successfully queried database. User count:', userCount);

    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: 'Test User'
      }
    });
    console.log('✅ Successfully created test user');

    // Test write operation
    const testBug = await prisma.bug.create({
      data: {
        userId: testUser.id,
        description: 'Test connection bug - please ignore',
        ticketNumber: `TEST-${Date.now()}`,
        status: 'open'
      }
    });
    console.log('✅ Successfully created test record:', testBug.ticketNumber);

    // Clean up test data
    await prisma.bug.delete({
      where: {
        ticketNumber: testBug.ticketNumber
      }
    });
    console.log('✅ Successfully deleted test bug');

    await prisma.user.delete({
      where: {
        id: testUser.id
      }
    });
    console.log('✅ Successfully deleted test user');

  } catch (error) {
    console.error('❌ Connection test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testConnection(); 