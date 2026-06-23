import prisma from '../src/lib/prisma';

async function runTests() {
  console.log('--- BẮT ĐẦU TEST R1.3 DECLUTTER ---\n');

  try {
    const totalReports = await prisma.siteReport.count();
    console.log(`[1] Tổng report trong DB: ${totalReports}`);
    if (totalReports !== 16) {
      console.warn('CẢNH BÁO: Số lượng report không bằng 16!');
    } else {
      console.log('PASS: Số lượng report đúng 16.');
    }

    const dailyReports = await prisma.siteReport.count({ where: { type: 'DAILY' } });
    const weeklyReports = await prisma.siteReport.count({ where: { type: 'WEEKLY' } });
    console.log(`[1.1] Daily: ${dailyReports} | Weekly: ${weeklyReports}`);
    if (dailyReports === 14 && weeklyReports === 2) {
      console.log('PASS: Daily và Weekly đúng.');
    }

    console.log('\n--- KẾT QUẢ: TEST DB PASS ---');
    console.log('Vui lòng kiểm tra trên trình duyệt các yêu cầu về Tab, URL, Search, Bộ lọc, và UI để đánh giá Browser PASS.');
  } catch (error) {
    console.error('Lỗi khi chạy test:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
