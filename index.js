import { Deobfuscator } from 'deobfuscator';
import * as acorn from 'acorn';
import estraverse from 'estraverse';

// Suppress logs from the deobfuscator library
console.log = () => {};

const url = 'https://cdn.jsdelivr.net/gh/ad-shield/e/index.js';

const response = await fetch(url);
const text = await response.text();

const opts = {
  ecmaVersion: "latest",
  sourceType: "script",
  ranges: true,
};

const node = acorn.parse(text, opts);
const deobfuscator = new Deobfuscator();
const ast = await deobfuscator.deobfuscateNode(node, opts);
console.log(ast);

const domains = new Set();

estraverse.traverse(ast, {
  enter(node) {
    if (node.type === 'ArrayExpression' && node.elements.length > 0) {
      const isStringArray = node.elements.every(e => e && e.type === "Literal" && typeof e.value === "string");

      if (isStringArray) {
        // Heuristic: Identify arrays containing domain-like strings
        const hasDomain = node.elements.some(e => e.value.includes('.') && !e.value.includes(' ') && e.value.length > 3);

        if (hasDomain) {
           node.elements.forEach(e => {
            try {
               let val = e.value;
               if (val.startsWith('http')) {
                   val = new URL(val).hostname;
               }
               if (val.includes('.') && !val.includes(' ')) {
                   domains.add(val);
               }
            } catch(err) {}
           });
        }
      }
    }
  }
});

const sortedDomains = Array.from(domains).sort();

if (sortedDomains.length === 0) {
  process.stderr.write("Error: No domains found.\n");
  process.exit(1);
}

for (const domain of sortedDomains) {
  process.stdout.write(`0.0.0.0 ${domain}\n`);
}
