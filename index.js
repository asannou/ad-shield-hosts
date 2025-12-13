import { Deobfuscator } from 'deobfuscator';
import * as acorn from 'acorn';
import estraverse from 'estraverse';

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
const deobfuscator = new Deobfuscator()
const ast = await deobfuscator.deobfuscateNode(node, opts);
console.log(ast);

const scripts = [];

estraverse.traverse(ast, {
  enter(node, parent) {
    if (
      node.type === "CallExpression" &&
      node.callee.type === "MemberExpression" &&
      node.callee.object.type === "Identifier" &&
      node.callee.object.name === "document" &&
      node.callee.property.type === "Identifier" &&
      node.callee.property.name === "createElement" &&
      node.arguments.length === 1 &&
      node.arguments[0].type === "Literal" &&
      node.arguments[0].value === "script"
    ) {
      if (
        parent.type === "VariableDeclarator" &&
        parent.id.type === "Identifier"
      ) {
        const varName = parent.id.name;

        estraverse.traverse(ast, {
          enter(n, p) {
            if (
              n.type === "AssignmentExpression" &&
              n.left.type === "MemberExpression" &&
              n.left.object.type === "Identifier" &&
              n.left.object.name === varName &&
              n.left.property.type === "Identifier" &&
              n.left.property.name === "src"
            ) {
              const idName = findIdentifierInBinary(n.right);
              if (!idName) return;

              const decl = findArrayPatternDecl(ast, idName);
              if (!decl) return;

              const sourceIdent = decl.init.name;
              const arr = findConditionalArray(ast, sourceIdent);
              if (arr) {
                scripts.push(arr);
              }
            }
          }
        });
      }
    }
  }
});

const nodes = [];
nodes.push(...scripts[0].trueBranch);
nodes.push(...scripts[0].falseBranch);

for (const node of nodes) {
  const url = new URL(node);
  process.stdout.write(`0.0.0.0 ${url.hostname}\n`);
}

function findIdentifierInBinary(node) {
  if (node.type === "BinaryExpression") {
    if (node.left.type === "Identifier") return node.left.name;
    const l = findIdentifierInBinary(node.left);
    if (l) return l;
    return findIdentifierInBinary(node.right);
  }
  return null;
}

function findArrayPatternDecl(ast, name) {
  let found = null;
  estraverse.traverse(ast, {
    enter(n) {
      if (
        n.type === "VariableDeclarator" &&
        n.id.type === "ArrayPattern" &&
        n.id.elements.length > 0 &&
        n.id.elements[0].type === "Identifier" &&
        n.id.elements[0].name === name &&
        n.init.type === "Identifier"
      ) {
        found = n;
        this.break();
      }
    }
  });
  return found;
}

function findConditionalArray(ast, identName) {
  let res = null;
  estraverse.traverse(ast, {
    enter(n) {
      if (
        n.type === "CallExpression" &&
        n.arguments.length === 1
      ) {
        const arg = n.arguments[0];
        if (
          arg.type === "ConditionalExpression" &&
          (  (arg.consequent.type === "ArrayExpression") ||
             (arg.alternate.type === "ArrayExpression")
          )
        ) {
          res = {
            trueBranch:  (arg.consequent.type === "ArrayExpression")
                          ? literalArray(arg.consequent) : null,
            falseBranch: (arg.alternate.type  === "ArrayExpression")
                          ? literalArray(arg.alternate) : null
          };
          this.break();
        }
      }
    }
  });
  return res;
}

function literalArray(arrNode) {
  return arrNode.elements
    .filter(e => e.type === "Literal")
    .map(e => e.value);
}

