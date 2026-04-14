import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

async function generateLLMSFull() {
  const docsDir = path.join(process.cwd(), 'src/content/docs');
  const outputFile = path.join(process.cwd(), 'public/llms-full.txt');

  console.log('Generating llms-full.txt...');

  const files = await glob('**/*.mdx', { cwd: docsDir });
  files.sort(); // Consistent order

  let combinedContent = '# Sharenote Full Documentation\n\n';
  combinedContent += `Generated on: ${new Date().toISOString()}\n\n`;
  combinedContent += '---\n\n';

  for (const file of files) {
    const filePath = path.join(docsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Add file header
    combinedContent += `## File: ${file}\n\n`;
    
    // Optional: strip frontmatter if desired, but for LLMs it might be useful context
    // For now, we'll keep it but add a clear boundary
    combinedContent += content;
    combinedContent += '\n\n---\n\n';
  }

  fs.writeFileSync(outputFile, combinedContent);
  console.log(`Successfully generated ${outputFile}`);
}

generateLLMSFull().catch(err => {
  console.error('Error generating llms-full.txt:', err);
  process.exit(1);
});
