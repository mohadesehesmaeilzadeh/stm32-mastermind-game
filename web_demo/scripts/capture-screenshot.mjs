import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const demoRoot = path.resolve(__dirname, "..");
const htmlPath = path.join(demoRoot, "index.html");
const latestPath = path.join(demoRoot, "assets", "screenshots", "screenshot-latest.png");
const demoPath = path.join(demoRoot, "assets", "screenshots", "screenshot-demo.png");
const chromePath = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const fileUrl = `file:///${htmlPath.replace(/\\/g, "/").replace(/ /g, "%20")}`;

const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath
});

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1
  });

  await page.goto(fileUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.setItem("mastermind-theme", "dark");
    window.scrollTo(0, 0);
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    document.querySelectorAll(".reveal").forEach((section) => section.classList.add("visible"));
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: latestPath, fullPage: false });

  await page.click("#startBtn");
  await page.click("#debugToggle");

  const secretText = await page.locator("#secretBox").innerText();
  const secret = secretText.replace(/[^0-9]/g, "").slice(0, 4) || "1234";
  const guess = secret
    .split("")
    .map((digit, index) => String((Number(digit) + index + 1) % 10))
    .join("");

  await page.fill("#guessInput", guess);
  await page.click("#submitBtn");
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const header = document.querySelector(".site-header");
    if (header) {
      header.style.display = "none";
    }
  });
  await page.locator("#demo").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.locator(".demo-shell").screenshot({ path: demoPath });
  console.log(`Updated ${latestPath}`);
  console.log(`Updated ${demoPath}`);
} finally {
  await browser.close();
}
