// На вход мы имеем {} или []
// Эталон первого уровня:
//{
//    block : 'bBlock',
//    elem  : 'elem',
//    mod   : 'modName',
//    val   : 'modValue',
//    tech  : 'techName',
//    mustDeps   : [],
//    shouldDeps : [],
//    noDeps     : []
//}
//
// Эталон второго (must, should, no):
//{
//    block : 'b1',
//    elems : [
//        { elem : 'e1' },
//        { elem : 'e2', mods : { m1 : 'v1' } }
//    ]
//}
//
// Необходимо провалидировать:
// 1. Корректные поля и их значения на первом уровне
// 2. Корректные поля и их значения на втором уровне
//
// Поля должны соответствовать спецификации из bem.info
// Значения должны соответствовать своему типу, описанному в спецификации
// Возможно надо ругаться на пересечения (mods + mod + val) ?
//
// Определить формат сообщения для ошибок

/**
 * String validation helper, that throw exceptions if variable is not a string
 * @param val
 * @returns {Boolean|String}
 */
var simpleStringValidation = function(val) {
    var valueType = typeof val;

    if (valueType !== 'string') {
        return 'Invalid type: '+ valueType +' (expected string)';
    }
};

/**
 * Array validation helper, that throw exceptions if item is not a string
 * @param {Array} arr
 * @returns {String}
 */
var simpleArrayWithStringValidation = function(arr) {
    var haveErr = arr.some(function(item) {
        return typeof item !== 'string';
    });

    if (haveErr) {
        return 'Invalid array item type: expected string';
    }
};

/**
 * Validation rules dictionary for fields
 * @type {Object}
 */
var validationRules = {

    block: {
        valueValidation: function(val) {
            // If we got block in object type notation, like this:
            // { tech : 'bemhtml', block : { block : 'link', mods : { pseudo : true } } }
            if (val instanceof Object && val.length === undefined) {
                Object.keys(val).forEach(function(field) {
                    Object.keys(val).forEach(function(field) {
                        var fieldValidation = (validationRules[field] || {}).valueValidation(val[field]);

                        if ((fieldValidation || []).length) {
                            errors.push(fieldValidation);
                        }

                    }, this)
                });
            } else {
                simpleStringValidation(val);
            }
        }
    },

    elem: {
        valueValidation: simpleStringValidation
    },

    elems: {
        valueValidation: function(val) {
            var errors = [];

            if (typeof val === 'string') {
                var strValidation = simpleStringValidation(val);

                if (strValidation) {
                    errors.push(strValidation);
                }
            } else if (val instanceof Object && val.length === undefined) {
                Object.keys(val).forEach(function(field) {
                    var fieldValidation = (validationRules[field] || {}).valueValidation(val[field]);

                    if ((fieldValidation || []).length) {
                        errors.push(fieldValidation);
                    }

                }, this);
            } else if (Array.isArray(val)) {
                var arrErr = simpleArrayWithStringValidation(val);

                arrErr && errors.push(arrErr);
            } else {
                var elemsValType = typeof val;

                errors.push('Invalid elems declaration type ('+ elemsValType +'), expected string, array or object');
            }

            return errors.length ? errors : true;
        }
    },

    'mod': {
        valueValidation: simpleStringValidation
    },

    'mods': {
        valueValidation: function(val) {
            var errors = [];

            // If mods in object type notation, like this - { disabled : true, focused : 'yes' }
            if (val instanceof Object && val.length === undefined) {
                Object.keys(val).forEach(function(field) {
                    var innerValue = val[field];

                    if (Array.isArray(innerValue)) {
                        var arrErr = simpleArrayWithStringValidation(innerValue);

                        arrErr && errors.push(arrErr);
                    } else if (typeof innerValue !== 'boolean') { // boolean value are valid, so skip it
                        var fieldErr = simpleStringValidation(innerValue);

                        if (fieldErr) {
                            errors.push(fieldErr);
                        }
                    }
                }, this);
            } else if (Array.isArray(val)) {
                var arrErr = simpleArrayWithStringValidation(val);

                arrErr && errors.push(arrErr);
            } else {
                var modsValType = typeof val;

                errors.push('Invalid mods declaration type ('+ modsValType +'), expected array or object');
            }

            return errors.length ? errors : true;
        }
    },

    'val': {
        valueValidation: function(val) {
            if (typeof val !== 'boolean') { // boolean value are valid, so skip it
                return simpleStringValidation(val);
            }
        }
    },

    'tech': {
        valueValidation: simpleStringValidation
    }

};

var validDeclFields = [
    'block',
    'elem',
    'elems',
    'mod',
    'mods',
    'val',
    'tech',
    'mustDeps',
    'shouldDeps',
    'noDeps',
    'include'
];

var validInnerDeclFields = [
    'block',
    'elem',
    'elems',
    'mods',
    'mod',
    'val',
    'tech',
    'mustDeps',
    'shouldDeps',
    'noDeps',
    'include'
];

var validator = {

    validate: function(deps) {
        var validationRes = [];

        [].concat(deps).forEach(function(decl) {
            var declValidationRes = this.validateDepsDeclaration(decl);

            if (declValidationRes) {
                validationRes.push(declValidationRes);
            }
        }, this);

        if (validationRes.length) {
            //console.log(validationRes.toString());
            return validationRes.toString();
        } else {
            return false;
            //console.log('All deps is valid!');
        }
    },

    validateDepsDeclaration: function(decl) {
        var errors = [];

        if (decl) {
            var declErr = this.validateDeclFields(decl, validDeclFields);

            (declErr || []).length && errors.push(declErr.join('\n'));
        }

        if (decl['mustDeps']) {
            var mustErr = this.validateSection(decl['mustDeps']);

            (mustErr || []).length && (errors.push(mustErr.join('\n')));
        }

        if (decl['shouldDeps']) {
            var shouldErr = this.validateSection(decl['shouldDeps']);

            (shouldErr || []).length && errors.push(shouldErr.join('\n'));
        }

        if (errors.length) {
            return errors.join('\n');
        }
    },

    validateSection: function(section) {
        var errors = [];

        if (Array.isArray(section)) {
            section.forEach(function(decl) {
                if (typeof decl !== 'string') { // short string declaration are valid
                    var innerDeclsErrors = this.validateDeclFields(decl, validInnerDeclFields);

                    (innerDeclsErrors || []).length && errors.push(innerDeclsErrors);
                }
            }, this);
        } else if (typeof section === 'object' && section.length === undefined) {
            var declErrors = this.validateDeclFields(section, validInnerDeclFields);

            (declErrors || []).length && errors.push(declErrors);
        } else if (typeof section !== 'string') { // short string declaration are valid
            var declType = typeof section;

            errors.push('Invalid declaration type ('+ declType +'), expected string, array or object');
        }

        if (errors.length) {
            return errors;
        }
    },

    validateDeclFields: function(decl, validFields) {
        var errors = [];

        if(typeof decl === 'object') {
            Object.keys(decl).forEach(function(field) {
                if (!~validFields.indexOf(field)) {
                    errors.push('Invalid field ('+ field +') in declaration');
                } else {
                    if (validationRules[field]) {
                        var fieldError = validationRules[field].valueValidation(decl[field]);

                        if ((fieldError || []).length) {
                            errors.push(fieldError);
                        }
                    }
                }
            }, this);
        } else {
            var declType = typeof decl;

            errors.push('Invalid declaration type ('+ declType +'), expected object');
        }

        if (errors.length) {
            return errors;
        }
    }

};

var vm = require('vm');

validator.validate(
    [{
        tech : 'spec.js',
        mustDeps : [
            { tech : 'bemhtml', block : { block : 'link', mods : { pseudo : true } } }
        ]
    }]
);

module.exports = {
    // TODO: в бемхинте нет возможности не указывать технологии
    forEntityTech: function (tech, techsConfig, entity) {
        if (tech.content) {
            var deps = vm.runInThisContext(tech.content),
                validateRes = validator.validate(deps);

            if (validateRes) {
                var error = {
                    msg: 'Deps validation',
                    tech: tech.tech,
                    value: validateRes
                };

                entity.addError(error);
            }
        }
    }
};
