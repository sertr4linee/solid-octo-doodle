const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Trouver l'utilisateur connecté
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true }
  });
  console.log('\n📋 Utilisateurs:', users);

  // Trouver tous les boards
  const boards = await prisma.board.findMany({
    include: {
      organization: { select: { id: true, name: true } },
      members: {
        include: {
          user: { select: { id: true, name: true } }
        }
      }
    }
  });
  console.log('\n🎯 Boards:', JSON.stringify(boards, null, 2));

  // Vérifier les membres des organisations
  const orgMembers = await prisma.member.findMany({
    include: {
      user: { select: { id: true, name: true } },
      organization: { select: { id: true, name: true } }
    }
  });
  console.log('\n👥 Membres d\'organisations:', JSON.stringify(orgMembers, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
