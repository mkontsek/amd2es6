/* eslint-disable */

function identifier(name) {
    return {
        type: 'Identifier',
        name,
    };
}

function literal(value) {
    return {
        type: 'Literal',
        value,
    };
}

function importDeclaration(specifiers, source) {
    return {
        type: 'ImportDeclaration',
        specifiers,
        source,
    };
}

function classDeclaration(id, superClass, body = {}) {
    return {
        type: 'ClassDeclaration',
        id,
        superClass,
        body,
    };
}

function importDefaultSpecifier(local) {
    return {
        type: 'ImportDefaultSpecifier',
        local,
    };
}

function classBody(body = []) {
    return {
        type: 'ClassBody',
        body,
    };
}

function methodDefinition(key, value) {
    return {
        type: 'MethodDefinition',
        static: false,
        key,
        value,
    };
}

function returnStatement(argument = {}) {
    return {
        type: 'ReturnStatement',
        argument,
    };
}

function functionExpression(body = {}) {
    return {
        type: 'FunctionExpression',
        generator: false,
        expression: false,
        params: [],
        async: false,
        id: null,
        body,
    };
}

function blockStatement(body = []) {
    // probably not an array
    if (typeof body.length === 'undefined') {
        body = [body];
    }

    return {
        type: 'BlockStatement',
        body,
    };
}

function memberExpression(object, property) {
    return {
        type: "MemberExpression",
        object,
        property,
    };
}

function thisExpression() {
    return {
        type: "ThisExpression",
    };
}

function expressionStatement(expression) {
    return {
        type: "ExpressionStatement",
        expression,
    }
}

function assignmentExpression(left, right) {
    return {
        type: "AssignmentExpression",
        operator: '=',
        left,
        right,
    }
}