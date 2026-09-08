function exportedSymbolCount(node) {
  if (!node.declaration) return node.specifiers.length;

  if (node.declaration.type === 'VariableDeclaration') {
    return node.declaration.declarations.length;
  }

  return 1;
}

const oneExportPerFile = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require each source file to export at most one symbol',
    },
    messages: {
      tooManyExports:
        'This file exports {{ count }} symbols. Keep at most one exported symbol per source file.',
    },
    schema: [],
  },
  create(context) {
    let count = 0;

    return {
      ExportAllDeclaration() {
        count += 1;
      },
      ExportDefaultDeclaration() {
        count += 1;
      },
      ExportNamedDeclaration(node) {
        count += exportedSymbolCount(node);
      },
      'Program:exit'(node) {
        if (count > 1) {
          context.report({
            node,
            messageId: 'tooManyExports',
            data: { count: String(count) },
          });
        }
      },
    };
  },
};

const readonlyInterfaceProperties = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require interface properties to be readonly',
    },
    messages: {
      mutableProperty:
        'Interface property "{{ name }}" must be declared readonly.',
    },
    schema: [],
  },
  create(context) {
    return {
      TSPropertySignature(node) {
        if (node.readonly) return;

        const name =
          node.key.type === 'Identifier'
            ? node.key.name
            : context.sourceCode.getText(node.key);
        context.report({
          node,
          messageId: 'mutableProperty',
          data: { name },
        });
      },
    };
  },
};

export default {
  rules: {
    'no-mutation': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          mutation: 'Replace values immutably; in-place mutation is forbidden.',
        },
      },
      create(context) {
        return {
          AssignmentExpression(node) {
            context.report({ node, messageId: 'mutation' });
          },
          UpdateExpression(node) {
            context.report({ node, messageId: 'mutation' });
          },
          VariableDeclaration(node) {
            if (node.kind === 'let' || node.kind === 'var') {
              context.report({ node, messageId: 'mutation' });
            }
          },
          PropertyDefinition(node) {
            if (!node.readonly) {
              context.report({ node, messageId: 'mutation' });
            }
          },
          CallExpression(node) {
            const services = context.sourceCode.parserServices;
            if (
              node.callee.type === 'MemberExpression' &&
              node.callee.property.type === 'Identifier' &&
              ['set', 'add'].includes(node.callee.property.name) &&
              services.program
            ) {
              const receiver = services.esTreeNodeToTSNodeMap.get(
                node.callee.object,
              );
              const name = services.program
                .getTypeChecker()
                .getTypeAtLocation(receiver)
                .getSymbol()?.name;
              if (['Map', 'WeakMap', 'Set', 'WeakSet'].includes(name)) {
                context.report({ node, messageId: 'mutation' });
              }
            }
            if (
              node.callee.type === 'MemberExpression' &&
              node.callee.property.type === 'Identifier' &&
              [
                'push',
                'pop',
                'shift',
                'unshift',
                'splice',
                'sort',
                'reverse',
                'copyWithin',
                'fill',
                'delete',
                'clear',
              ].includes(node.callee.property.name)
            ) {
              context.report({ node, messageId: 'mutation' });
            }
          },
        };
      },
    },
    'one-export-per-file': oneExportPerFile,
    'readonly-interface-properties': readonlyInterfaceProperties,
  },
};
