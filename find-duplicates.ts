// run by doing "npx tsx find-duplicates.ts" at cli in the chat-bet-parse folder
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

// Import all fixture modules
import * as edgeCases from './tests/fixtures/edge-cases.fixtures';
import * as errorCases from './tests/fixtures/error-cases.fixtures';
import * as gameSequence from './tests/fixtures/game-sequence.fixtures';
import * as gameTotals from './tests/fixtures/game-totals.fixtures';
import * as individualContestants from './tests/fixtures/individual-contestants.fixtures';
import * as moneylines from './tests/fixtures/moneylines.fixtures';
import * as periodParsing from './tests/fixtures/period-parsing.fixtures';
import * as priceParsing from './tests/fixtures/price-parsing.fixtures';
import * as props from './tests/fixtures/props.fixtures';
import * as series from './tests/fixtures/series.fixtures';
import * as sizeParsing from './tests/fixtures/size-parsing.fixtures';
import * as specialFormats from './tests/fixtures/special-formats.fixtures';
import * as sportLeagueInference from './tests/fixtures/sport-league-inference.fixtures';
import * as spreads from './tests/fixtures/spreads.fixtures';
import * as teamTotals from './tests/fixtures/team-totals.fixtures';
import * as writein from './tests/fixtures/writein.fixtures';

interface TestCase {
  description: string;
  input: string;
  [key: string]: any;
}

interface DuplicateInfo {
  file: string;
  exportName: string;
  case: TestCase;
  index: number;
}

interface DuplicateGroup {
  input: string;
  cases: DuplicateInfo[];
}

const fixtureModules: Record<string, any> = {
  'edge-cases.fixtures.ts': edgeCases,
  'error-cases.fixtures.ts': errorCases,
  'game-sequence.fixtures.ts': gameSequence,
  'game-totals.fixtures.ts': gameTotals,
  'individual-contestants.fixtures.ts': individualContestants,
  'moneylines.fixtures.ts': moneylines,
  'period-parsing.fixtures.ts': periodParsing,
  'price-parsing.fixtures.ts': priceParsing,
  'props.fixtures.ts': props,
  'series.fixtures.ts': series,
  'size-parsing.fixtures.ts': sizeParsing,
  'special-formats.fixtures.ts': specialFormats,
  'sport-league-inference.fixtures.ts': sportLeagueInference,
  'spreads.fixtures.ts': spreads,
  'team-totals.fixtures.ts': teamTotals,
  'writein.fixtures.ts': writein,
};

function mergeCases(cases: TestCase[], keepDescription: string): TestCase {
  const merged: any = { description: keepDescription };

  for (const testCase of cases) {
    for (const [key, value] of Object.entries(testCase)) {
      if (key === 'description') continue;

      if (merged[key] === undefined) {
        merged[key] = value;
      } else if (JSON.stringify(merged[key]) !== JSON.stringify(value)) {
        throw new Error(`Conflicting values for key "${key}": ${JSON.stringify(merged[key])} vs ${JSON.stringify(value)}`);
      }
    }
  }

  return merged;
}

function updateFixtureFile(filePath: string, exportName: string, indicesToRemove: number[], mergedCase?: TestCase, mergeIndex?: number): void {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Convert the merged case to TypeScript string if needed
  const caseToString = (obj: TestCase): string => {
    const lines: string[] = ['{'];

    for (const [key, value] of Object.entries(obj)) {
      let valueStr: string;

      if (value === undefined) continue;

      if (typeof value === 'string') {
        valueStr = `'${value.replace(/'/g, "\\'")}'`;
      } else if (value instanceof Date) {
        valueStr = `new Date(${value.getFullYear()}, ${value.getMonth()}, ${value.getDate()})`;
      } else if (typeof value === 'object') {
        // Format objects inline with proper key formatting
        const objStr = JSON.stringify(value)
          .replace(/"([^"]+)":/g, '$1:')  // Remove quotes from keys
          .replace(/"/g, "'");  // Replace double quotes with single quotes for values
        valueStr = objStr;
      } else {
        valueStr = String(value);
      }

      lines.push(`    ${key}: ${valueStr},`);
    }

    lines.push('  }');
    return lines.join('\n');  // Use actual newline, not escaped
  };

  // Find the export declaration
  const exportRegex = new RegExp(`export\\s+const\\s+${exportName}[^=]*=\\s*\\[`, 'gs');
  const match = exportRegex.exec(content);

  if (!match) {
    console.error(`Could not find export ${exportName} in ${filePath}`);
    return;
  }

  const startIdx = match.index! + match[0].length;

  // Parse to find test case positions
  let bracketDepth = 1;
  let braceDepth = 0;
  let idx = startIdx;
  let inString = false;
  let stringChar = '';
  const testCases: { start: number; end: number }[] = [];
  let caseStart = -1;

  while (idx < content.length && bracketDepth > 0) {
    const char = content[idx];
    const prevChar = idx > 0 ? content[idx - 1] : '';

    if (!inString && (char === '"' || char === "'" || char === '`') && prevChar !== '\\\\') {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && prevChar !== '\\\\') {
      inString = false;
    } else if (!inString) {
      if (char === '{') {
        if (braceDepth === 0 && caseStart === -1) {
          caseStart = idx;
        }
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
        if (braceDepth === 0 && caseStart !== -1) {
          testCases.push({ start: caseStart, end: idx + 1 });
          caseStart = -1;
        }
      } else if (char === '[') {
        bracketDepth++;
      } else if (char === ']') {
        bracketDepth--;
      }
    }

    idx++;
  }

  // Sort indices to remove in descending order
  indicesToRemove.sort((a, b) => b - a);

  // Build new content
  let newContent = content;

  // First, update the merged case if specified
  if (mergedCase !== undefined && mergeIndex !== undefined && mergeIndex < testCases.length) {
    const caseStr = caseToString(mergedCase);
    const { start, end } = testCases[mergeIndex];
    newContent = newContent.slice(0, start) + caseStr + newContent.slice(end);

    // Adjust positions after replacement
    const sizeDiff = caseStr.length - (end - start);
    for (let i = mergeIndex + 1; i < testCases.length; i++) {
      testCases[i].start += sizeDiff;
      testCases[i].end += sizeDiff;
    }
  }

  // Remove duplicates
  for (const idxToRemove of indicesToRemove) {
    if (idxToRemove < testCases.length && idxToRemove !== mergeIndex) {
      const { start, end } = testCases[idxToRemove];

      // Also remove trailing comma and whitespace
      let removeEnd = end;
      while (removeEnd < newContent.length && /[\\s,]/.test(newContent[removeEnd])) {
        removeEnd++;
      }

      // Check if we need to remove a preceding comma (for last item)
      let removeStart = start;
      if (idxToRemove === testCases.length - 1 && idxToRemove > 0) {
        let checkIdx = start - 1;
        while (checkIdx > 0 && /\\s/.test(newContent[checkIdx])) {
          checkIdx--;
        }
        if (newContent[checkIdx] === ',') {
          removeStart = checkIdx;
        }
      }

      newContent = newContent.slice(0, removeStart) + newContent.slice(removeEnd);

      // Adjust remaining positions
      const removed = removeEnd - removeStart;
      for (let i = idxToRemove + 1; i < testCases.length; i++) {
        testCases[i].start -= removed;
        testCases[i].end -= removed;
      }
    }
  }

  fs.writeFileSync(filePath, newContent);
}

async function main() {
  const rl = readline.createInterface({ input, output });

  console.log('\\nSearching for duplicate test fixtures...\\n');

  // Collect all test cases
  const duplicateGroups = new Map<string, DuplicateGroup>();

  for (const [fileName, module] of Object.entries(fixtureModules)) {
    for (const [exportName, value] of Object.entries(module)) {
      if (Array.isArray(value)) {
        value.forEach((testCase: any, index: number) => {
          if (testCase.input) {
            const input = testCase.input;

            if (!duplicateGroups.has(input)) {
              duplicateGroups.set(input, { input, cases: [] });
            }

            duplicateGroups.get(input)!.cases.push({
              file: fileName,
              exportName,
              case: testCase,
              index
            });
          }
        });
      }
    }
  }

  // Filter to only duplicates
  const actualDuplicates = Array.from(duplicateGroups.values())
    .filter(group => group.cases.length > 1);

  if (actualDuplicates.length === 0) {
    console.log('No duplicate test cases found!');
    rl.close();
    return;
  }

  console.log(`Found ${actualDuplicates.length} duplicate test cases.\\n`);

  // Process each duplicate
  for (const group of actualDuplicates) {
    console.log('='.repeat(80));
    console.log(`\\nDuplicate found with input:\\n  "${group.input}"\\n`);
    console.log('Found in:');

    const fileGroups = new Map<string, DuplicateInfo[]>();

    group.cases.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.file} (export: ${item.exportName})`);
      console.log(`     Description: "${item.case.description}"`);

      if (!fileGroups.has(item.file)) {
        fileGroups.set(item.file, []);
      }
      fileGroups.get(item.file)!.push(item);
    });

    // Check merge compatibility
    try {
      const testMerge = mergeCases(group.cases.map(c => c.case), group.cases[0].case.description);
      console.log('\\n✓ Cases can be merged without conflicts');
    } catch (error: any) {
      console.log(`\\n⚠️  Warning: ${error.message}`);
      console.log('Skipping this duplicate group...\\n');
      continue;
    }

    const uniqueFiles = Array.from(fileGroups.keys());
    console.log('\\nWhich file should keep this test case?');
    uniqueFiles.forEach((file, idx) => {
      console.log(`  ${idx + 1}. ${file}`);
    });

    const answer = await rl.question(`Enter choice (1-${uniqueFiles.length}) or 's' to skip: `);

    if (answer.toLowerCase() === 's') {
      console.log('Skipping...\\n');
      continue;
    }

    const choice = parseInt(answer);
    if (isNaN(choice) || choice < 1 || choice > uniqueFiles.length) {
      console.log('Invalid choice, skipping...\\n');
      continue;
    }

    const keepFile = uniqueFiles[choice - 1];
    const keepCases = fileGroups.get(keepFile)!;
    const keepCase = keepCases[0];

    // Merge all cases
    const mergedCase = mergeCases(group.cases.map(c => c.case), keepCase.case.description);

    console.log(`\\n✓ Keeping in ${keepFile}, removing from others...\\n`);

    // Update files
    for (const [file, cases] of fileGroups) {
      const filePath = path.join(process.cwd(), 'tests', 'fixtures', file);

      if (file === keepFile) {
        // Update the first occurrence with merged case, remove others
        const firstCase = cases[0];
        const otherIndices = cases.slice(1).map(c => c.index);

        if (otherIndices.length > 0) {
          updateFixtureFile(filePath, firstCase.exportName, otherIndices, mergedCase, firstCase.index);
        } else {
          // Just update the single case
          updateFixtureFile(filePath, firstCase.exportName, [], mergedCase, firstCase.index);
        }
      } else {
        // Remove all occurrences from this file
        const byExport = new Map<string, number[]>();

        for (const c of cases) {
          if (!byExport.has(c.exportName)) {
            byExport.set(c.exportName, []);
          }
          byExport.get(c.exportName)!.push(c.index);
        }

        for (const [exportName, indices] of byExport) {
          updateFixtureFile(filePath, exportName, indices);
        }
      }
    }

    console.log(`✓ Updated files successfully\\n`);
  }

  console.log('\\nDone processing duplicates!');
  rl.close();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});