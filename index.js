/* eslint-disable */

function removeValuesFromObject(obj, key) {
    for (const prop in obj) {
        if (prop === key) {
            delete obj[prop];
        } else if (typeof obj[prop] === 'object') {
            removeValuesFromObject(obj[prop], key);
        }
    }
}

function getPotentialClassnameFromComment(source) {
    let className = 'MyClass';

    source.split('\n').forEach((text) => {
        if (text.indexOf('@class') > -1) {
            text.split('\n').forEach((line) => {
                if (line.indexOf('@class') > -1) {
                    className = line.trim().split(' ').pop();
                }
            });
        }
    });

    return className;
}

function getMainFunction(scriptAst) {
    const defineArguments = scriptAst.body[0].expression.arguments;
    const mainFunction = defineArguments[1];

    if (defineArguments.length === 3) {
        return defineArguments[2];
    }

    return mainFunction;
}

function getImportPaths(scriptAst) {
    const defineArguments = scriptAst.body[0].expression.arguments;
    let importPaths = defineArguments[0];

    if (defineArguments.length === 3) {
        importPaths = defineArguments[1];
    }

    return importPaths.elements.map((el) => {
        const path = el.value;

        if (path === 'marionette') {
            return 'backbone.marionette';
        } else if (path === 'underscore') {
            return 'lodash';
        }

        return path;
    });
}

function getImportValues(scriptAst) {
    const mainFunction = getMainFunction(scriptAst);

    return mainFunction.params.map(param => param.name);
}

function getImportSpecifiers(value, path) {
    if (path.match(/myproject\.current/) ||
        path.match(/myproject\.app/)) {
        return [];
    }

    return [importDefaultSpecifier(identifier(value))];
}

function checkAndAddImport(localVar, localVarPath, importValues, importPaths) {
    if (importValues.includes(localVar)) {
        return;
    }

    importValues.unshift(localVar);
    importPaths.unshift(localVarPath);
}

function migrateImports(scriptAst, moduleAst) {
    const importValues = getImportValues(scriptAst);
    const importPaths = getImportPaths(scriptAst);

    checkAndAddImport('Backbone', 'backbone', importValues, importPaths);
    checkAndAddImport('Marionette', 'backbone.marionette', importValues, importPaths);
    checkAndAddImport('$', 'jquery', importValues, importPaths);
    checkAndAddImport('_', 'lodash', importValues, importPaths);
    checkAndAddImport('moment', 'moment', importValues, importPaths);

    importPaths.forEach((path, index) => {
        let specifiers = [];

        if (importValues.length > index) {
            specifiers = getImportSpecifiers(importValues[index], path);
        }

        moduleAst.body.push(
            importDeclaration(
                specifiers,
                literal(path),
            ),
        );
    });
}

function includeOwnPropsInInitializeFunction(ownProps, initializeFn) {
    let shouldAddInitialzeFnToBody = false;
    let functionBlock = blockStatement();
    if (ownProps.length === 0) {
        return;
    }

    if (initializeFn === null) {
        shouldAddInitialzeFnToBody = true;
        initializeFn = methodDefinition(
            identifier('initialize'),
            functionExpression(functionBlock),
        );
    } else {
        functionBlock = initializeFn.value.body;
    }

    const ownPropsStatements = []

    ownProps.forEach(prop => {
        const leftSide = memberExpression(thisExpression(), identifier(prop.key.name));
        const rightSide = prop.value;

        ownPropsStatements.push(
            expressionStatement(assignmentExpression(leftSide, rightSide))
        );
    });

    functionBlock.body = ownPropsStatements.concat(functionBlock.body)

    if (shouldAddInitialzeFnToBody) {
        return initializeFn;
    }

    return null;
}

function getFunctionsFromClassProps(props) {
    const ownProps = [];
    let initializeFn = null;

    const functions = props.reduce((acc, prop) => {
        let { key, value } = prop;

        if (key.name === 'initialize') {
            initializeFn = methodDefinition(key, value);
            acc.push(initializeFn);
            return acc;
        } else if (value.type === 'FunctionExpression') {
            acc.push(methodDefinition(key, value));
            return acc;
        }

        value = functionExpression(
            blockStatement(
                returnStatement(value),
            ),
        );

        if (['ui', 'behaviors', 'events', 'regions', 'defaults', 'modelEvents',
                'collectionEvents', 'options', 'className', 'tagName', 'id'].includes(key.name)) {
            acc.push(methodDefinition(key, value));
        } else if (key === 'template') {
            acc.push(methodDefinition('getTemplate', value));
        } else {
            ownProps.push(prop);
        }

        return acc;
    }, []);

    initializeFn = includeOwnPropsInInitializeFunction(ownProps, initializeFn);

    if (initializeFn) {
        functions.splice(0, 0, initializeFn);
    }

    return functions;
}

function migrateReturnStatement(mainBlock, moduleAst, className) {
    const extendsClass = mainBlock.argument.callee.object;
    const insideExtendedObject = mainBlock.argument.arguments[0];

    const classDef = classDeclaration(
        identifier(className),
        extendsClass,
        classBody(
            getFunctionsFromClassProps(insideExtendedObject.properties),
        ),
    );
    moduleAst.body.push(classDef);
}

function migrateFunctionBlock(scriptAst, moduleAst, className) {
    const mainFunction = getMainFunction(scriptAst);
    const mainBlock = mainFunction.body.body;

    if (mainBlock[0].type === 'ReturnStatement') {
        migrateReturnStatement(mainBlock[0], moduleAst, className);
    } else {
        mainBlock.forEach(block => moduleAst.body.push(block));
    }
}

document.querySelector('button[name=submit]').onclick = () => {
    const inputArea = document.querySelector('.amd');
    const outputArea = document.querySelector('.es6');
    const outputCopyArea = document.querySelector('.output-copy');
    const source = inputArea.value
        .trim()
        .replace(/["']use strict["'];/g, '');

    const moduleAst = {
        type: 'Program',
        sourceType: 'module',
        ecmaVersion: 8,
        body: [],
    };

    const comments = [];
    const tokens = [];
    const className = getPotentialClassnameFromComment(source);

    const scriptAst = acorn.parse(source, {
        ranges: true,
        onComment: comments,
        onToken: tokens,
    });

    escodegen.attachComments(scriptAst, comments, tokens);

    removeValuesFromObject(scriptAst, 'start');
    removeValuesFromObject(scriptAst, 'end');
    removeValuesFromObject(scriptAst, 'range');

    migrateImports(scriptAst, moduleAst);
    migrateFunctionBlock(scriptAst, moduleAst, className);

    const output = `${escodegen.generate(moduleAst, { comment: true })}\nmodule.exports = ${className}\n`;

    outputArea.innerHTML = output;
    outputCopyArea.innerHTML = output;

    hljs.highlightBlock(document.querySelector('#code-output'));
};
