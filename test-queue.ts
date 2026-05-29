import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const msg = await prisma.whatsappQueue.create({
        data: {
            number: '+919999999999',
            message: 'Test message from queue'
        }
    });
    console.log('Created msg', msg.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
