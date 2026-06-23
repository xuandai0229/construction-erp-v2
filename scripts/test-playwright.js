const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Navigating to login...");
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'daicongtu2910@gmail.com');
  await page.fill('input[type="password"]', 'xuandai0229');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/reports');

  console.log("Navigating to reports...");
  await page.click('button:has-text("Tạo báo cáo mới")');
  await page.waitForSelector('text=Hình ảnh & Tài liệu đính kèm', { state: 'visible' });

  // Create a real fake JPG file
  const testImagePath = path.join(__dirname, 'test-image.jpg');
  fs.writeFileSync(testImagePath, Buffer.from('FFD8FFE000104A46494600010101006000600000FFDB004300080606070605080707070909080A0C140D0C0B0B0C1912130F141D1A1F1E1D1A1C1C20242E2720222C231C1C2837292C30313434341F27393D38323C2E333432FFDB0043010909090C0B0C180D0D1832211C213232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232FFC00011080001000103011100021101031101FFC4001F0000010501010101010100000000000000000102030405060708090A0BFFC400B5100002010303020403050504040000017D01020300041105122131410613516107227114328191A1082342B1C11552D1F02433627282090A161718191A25262728292A3435363738393A434445464748494A535455565758595A636465666768696A737475767778797A838485868788898A92939495969798999AA2A3A4A5A6A7A8A9AAB2B3B4B5B6B7B8B9BAC2C3C4C5C6C7C8C9CAD2D3D4D5D6D7D8D9DAE1E2E3E4E5E6E7E8E9EAF1F2F3F4F5F6F7F8F9FAFFC4001F0100030101010101010101010000000000000102030405060708090A0BFFC400B51100020102040403040705040400010277000102031104052131061241510761711322328108144291A1B1C109233352F0156272D10A162434E125F11718191A262728292A35363738393A434445464748494A535455565758595A636465666768696A737475767778797A82838485868788898A92939495969798999AA2A3A4A5A6A7A8A9AAB2B3B4B5B6B7B8B9BAC2C3C4C5C6C7C8C9CAD2D3D4D5D6D7D8D9DAE2E3E4E5E6E7E8E9EAF2F3F4F5F6F7F8F9FAFFDA000C03010002110311003F00F911', 'hex'));

  console.log("Setting input file for photos...");
  // Find the hidden input file for photos
  const photoInput = await page.$('input[type="file"][accept*="image/png"]');
  await photoInput.setInputFiles(testImagePath);

  // Wait a bit to see if toast error appears
  await page.waitForTimeout(1000);


  const hasErrorToast = await page.$$('text=File không đúng định dạng');
  if (hasErrorToast.length > 0) {
    console.log("TOAST ERROR DETECTED: File không đúng định dạng!");
  } else {
    console.log("NO TOAST ERROR for photos");
  }

  const counter = await page.innerText('label:has-text("Hình ảnh hiện trường")');
  console.log("Photo counter says:", counter);

  // Clean up
  fs.unlinkSync(testImagePath);
  await browser.close();
})();
