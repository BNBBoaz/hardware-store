const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createOwner() {
  const business = await prisma.business.create({
    data: { name: 'Bundi Hardware Store' }
  });
  
  const hash = await bcrypt.hash('bundi123', 10);
  
  const user = await prisma.user.create({
    data: {
      businessId: business.id,
      name: 'Bundi',
      email: 'bundi@store.com',
      passwordHash: hash,
      role: 'OWNER',
      isActive: true
    }
  });
  
  console.log('Owner created:', user.email);
  console.log('Business ID:', business.id);
}

createOwner().catch(console.error).finally(() => prisma.disconnect());
