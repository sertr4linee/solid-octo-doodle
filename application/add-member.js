const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const biancaId = 'x5DTqAUuPaRAK1tmC5HEXJdviziOWfjt';
  const boardId = 'board_1763675396628_w9dmc';
  
  // Ajouter Bianca au board
  const member = await prisma.boardMember.create({
    data: {
      id: `${boardId}-${biancaId}`,
      boardId: boardId,
      userId: biancaId,
      role: 'member',
      createdAt: new Date(),
    },
  });
  
  console.log('✅ Bianca Rossi ajoutée au board:', member);
  
  // Créer une activité
  await prisma.activity.create({
    data: {
      id: `activity_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type: 'member_added',
      description: 'Bianca Rossi was added to the board',
      boardId: boardId,
      userId: biancaId,
      createdAt: new Date(),
    },
  });
  
  console.log('✅ Activité créée');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
