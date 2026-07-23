import prisma from './src/lib/prisma';
prisma.supervisionWeeklyDossier.findUnique({where:{id:'cmrud8dmh0000w4wk9he6al8i'}}).then(d=>console.log("STATUS IN DB IS:", d?.status)).finally(()=>process.exit(0));
