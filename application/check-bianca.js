const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const biancaId = 'x5DTqAUuPaRAK1tmC5HEXJdviziOWfjt';
  
  // Vérifier les boards dont Bianca est membre
  const boards = await prisma.board.findMany({
    where: {
      members: {
        some: {
          userId: biancaId
        }
      }
    },
    include: {
      organization: true,
      members: {
        include: {
          user: true
        }
      }
    }
  });
  
  console.log('📋 Boards de Bianca:', JSON.stringify(boards, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
