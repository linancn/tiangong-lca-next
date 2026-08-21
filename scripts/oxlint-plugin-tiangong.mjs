const FUNCTION_WRAPPERS = new Set([
  'ChainExpression',
  'ConditionalExpression',
  'LogicalExpression',
  'TSAsExpression',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
]);

const THIS_ARG_METHODS = new Set([
  'every',
  'filter',
  'find',
  'findIndex',
  'flatMap',
  'forEach',
  'map',
  'some',
]);

function startsWithUpperCase(name) {
  return typeof name === 'string' && /^[A-Z]/u.test(name);
}

function memberName(node) {
  if (!node || node.type !== 'MemberExpression') return undefined;
  if (!node.computed && node.property.type === 'Identifier') return node.property.name;
  if (node.computed && node.property.type === 'Literal') return node.property.value;
  return undefined;
}

function isNullish(node) {
  return (
    !node ||
    (node.type === 'Literal' && node.value === null) ||
    (node.type === 'Identifier' && node.name === 'undefined')
  );
}

function hasExplicitThisParameter(node) {
  return node.params?.some(
    (parameter) => parameter.type === 'Identifier' && parameter.name === 'this',
  );
}

function unwrapFunctionDestination(node) {
  let current = node;
  while (current.parent && FUNCTION_WRAPPERS.has(current.parent.type)) {
    current = current.parent;
  }
  return current;
}

function isCallbackWithThisArgument(node, call) {
  if (call.type !== 'CallExpression') return false;
  if (
    call.callee.type === 'MemberExpression' &&
    THIS_ARG_METHODS.has(String(memberName(call.callee)))
  ) {
    return (
      call.arguments[0] === node && call.arguments.length === 2 && !isNullish(call.arguments[1])
    );
  }
  if (
    call.callee.type === 'MemberExpression' &&
    call.callee.object.type === 'Identifier' &&
    call.callee.object.name === 'Array' &&
    memberName(call.callee) === 'from'
  ) {
    return (
      call.arguments[1] === node && call.arguments.length === 3 && !isNullish(call.arguments[2])
    );
  }
  if (
    call.callee.type === 'MemberExpression' &&
    call.callee.object.type === 'Identifier' &&
    call.callee.object.name === 'Reflect' &&
    memberName(call.callee) === 'apply'
  ) {
    return (
      call.arguments[0] === node && call.arguments.length === 3 && !isNullish(call.arguments[1])
    );
  }
  return false;
}

function functionHasDefinedThis(node) {
  if (hasExplicitThisParameter(node) || startsWithUpperCase(node.id?.name)) return true;
  if (node.type === 'FunctionDeclaration') return false;

  const destination = unwrapFunctionDestination(node);
  const parent = destination.parent;
  if (!parent) return false;

  if (
    (parent.type === 'Property' ||
      parent.type === 'PropertyDefinition' ||
      parent.type === 'MethodDefinition') &&
    parent.value === destination
  ) {
    return true;
  }
  if (
    (parent.type === 'AssignmentExpression' || parent.type === 'AssignmentPattern') &&
    parent.right === destination
  ) {
    return (
      parent.left.type === 'MemberExpression' ||
      (node.id === null &&
        parent.left.type === 'Identifier' &&
        startsWithUpperCase(parent.left.name))
    );
  }
  if (parent.type === 'VariableDeclarator' && parent.init === destination) {
    return (
      node.id === null && parent.id.type === 'Identifier' && startsWithUpperCase(parent.id.name)
    );
  }
  if (
    parent.type === 'MemberExpression' &&
    parent.object === destination &&
    new Set(['apply', 'bind', 'call']).has(String(memberName(parent))) &&
    parent.parent?.type === 'CallExpression' &&
    parent.parent.callee === parent
  ) {
    return parent.parent.arguments.length >= 1 && !isNullish(parent.parent.arguments[0]);
  }
  return isCallbackWithThisArgument(destination, parent);
}

const noInvalidThis = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow this where strict-mode execution leaves it undefined',
    },
    schema: [],
    messages: {
      unexpectedThis: "Unexpected 'this'.",
    },
  },
  create(context) {
    return {
      ThisExpression(node) {
        let current = node.parent;
        while (current) {
          if (current.type === 'ArrowFunctionExpression') {
            current = current.parent;
            continue;
          }
          if (current.type === 'PropertyDefinition' || current.type === 'StaticBlock') return;
          if (current.type === 'FunctionDeclaration' || current.type === 'FunctionExpression') {
            if (functionHasDefinedThis(current)) return;
            context.report({ messageId: 'unexpectedThis', node });
            return;
          }
          if (current.type === 'Program') {
            context.report({ messageId: 'unexpectedThis', node });
            return;
          }
          current = current.parent;
        }
      },
    };
  },
};

export default {
  meta: {
    name: 'tiangong',
  },
  rules: {
    'no-invalid-this': noInvalidThis,
  },
};
