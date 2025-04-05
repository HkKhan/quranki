const fs = require("fs");
const path = require("path");

const jsonDirectory = path.join(process.cwd(), "public/json");
const outputFile = path.join(process.cwd(), "public/ayah-page-mapping.csv");

// Output format: surah_id,ayah_id,page_number
async function generateMapping() {
  console.log("Generating ayah-to-page mapping CSV...");

  // Create the CSV header
  const csvLines = ["surah_id,ayah_id,page_number"];

  // Find all page_*.json files
  const filePattern = /^page_(\d+)\.json$/;
  const files = fs
    .readdirSync(jsonDirectory)
    .filter((filename) => filePattern.test(filename))
    .sort((a, b) => {
      const pageA = parseInt(a.match(filePattern)[1]);
      const pageB = parseInt(b.match(filePattern)[1]);
      return pageA - pageB;
    });

  console.log(`Found ${files.length} page files.`);

  // Process each file
  for (const filename of files) {
    const pageNumber = parseInt(filename.match(filePattern)[1]);
    const filePath = path.join(jsonDirectory, filename);

    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const pageData = JSON.parse(fileContent);

      // Extract each ayah on this page
      for (const ayah of pageData) {
        const surahId = ayah.sura_id;
        const ayahId = ayah.aya_id;

        // Add to CSV lines
        csvLines.push(`${surahId},${ayahId},${pageNumber}`);
      }
    } catch (error) {
      console.error(`Error processing ${filename}:`, error.message);
    }
  }

  // Write the CSV file
  fs.writeFileSync(outputFile, csvLines.join("\n"));
  console.log(`Generated mapping with ${csvLines.length - 1} entries.`);
  console.log(`CSV file saved to ${outputFile}`);
}

generateMapping().catch(console.error);
