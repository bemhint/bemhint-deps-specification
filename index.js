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
 * Helper to recognize type of variable
 * @param obj
 * @returns {string}
 */
var toType = function(obj) {
  return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
};

/**
 * String validation helper, that throw exceptions if variable is not a string
 * @param val
 * @param [fieldName]
 * @returns {Boolean|String}
 */
var simpleStringValidation = function(val, fieldName) {
    var valueType = toType(val);

    if (valueType !== 'string') {
        return fieldName ?
            'Invalid type at field "'+fieldName+'": '+ valueType +' (expected string)' :
            'Invalid type: '+ valueType +' (expected string)';
    }
};

/**
 * Array validation helper, that throw exceptions if item is not a string
 * @param {Array} arr
 * @param {String} [fieldName]
 * @returns {String}
 */
var simpleArrayWithStringValidation = function(arr, fieldName) {
    var haveErr = arr.some(function(item) {
        return toType(item) !== 'string';
    });

    if (haveErr) {
        return fieldName ?
            'Invalid array item type in "'+fieldName+'": expected string' :
            'Invalid array item type: expected string';
    }
};

/**
 * Validation rules dictionary for fields
 * @type {Object}
 */
var validationRules = {

    block: {
        valueValidation: function(block) {
            // If we got block in object type notation, like this:
            // { tech : 'bemhtml', block : { block : 'link', mods : { pseudo : true } } }
            if (toType(block) === 'object') {
                var errors = [];

                Object.keys(block).forEach(function(field) {
                    if (validationRules[field]) {
                        var fieldErr = validationRules[field].valueValidation((block[field]));

                        (fieldErr || []).length && (errors.push(fieldErr));
                    } else if (!~validDeclFields.indexOf(field)) {
                        errors.push('Invalid field ('+ field +') in declaration');
                    }
                }, this);

                if (errors.length) {
                    return errors;
                }
            } else if(toType(block) !== 'string') {
                var blockValType = toType(block);

                return 'Invalid block declaration type ('+ blockValType +'), expected string or object';
            }
        }
    },

    elem: {
        valueValidation: function(elem) {
            return simpleStringValidation(elem, 'elem');
        }
    },

    elems: {
        valueValidation: function(elems) {
            var errors = [];

            if (toType(elems) === 'string') {
                var strValidation = simpleStringValidation(elems, 'elems');

                if (strValidation) {
                    errors.push(strValidation);
                }
            } else if (toType(elems) === 'object') {
                Object.keys(elems).forEach(function(field) {
                    if (validationRules[field]) {
                        var fieldErr = validationRules[field].valueValidation((elems[field]));

                        (fieldErr || []).length && (errors.push(fieldErr));
                    } else if (!~validDeclFields.indexOf(field)) {
                        errors.push('Invalid field ('+ field +') in declaration');
                    }
                }, this);
            } else if (toType(elems) === 'array') {
                var arrErr = simpleArrayWithStringValidation(elems, 'elems');

                arrErr && errors.push(arrErr);
            } else {
                var elemsValType = toType(elems);

                errors.push('Invalid elems declaration type ('+ elemsValType +'), expected string, array or object');
            }

            if (errors.length) {
                return errors;
            }
        }
    },

    'mod': {
        valueValidation: function(mod) {
            return simpleStringValidation(mod, 'mod');
        }
    },

    'mods': {
        valueValidation: function(mods) {
            var errors = [];

            // If mods in object type notation, like this - { disabled : true, focused : 'yes' }
            if (mods instanceof Object && mods.length === undefined) {
                Object.keys(mods).forEach(function(field) {
                    var innerValue = mods[field];

                    if (toType(innerValue) === 'array') {
                        var arrErr = simpleArrayWithStringValidation(innerValue, 'mods > ' + field);

                        arrErr && errors.push(arrErr);
                    } else if (toType(innerValue) !== 'boolean') { // boolean value are valid, so skip it
                        var fieldErr = simpleStringValidation(innerValue, 'mods > ' + field);

                        if (fieldErr) {
                            errors.push(fieldErr);
                        }
                    }
                }, this);
            } else if (toType(mods) === 'array') {
                var arrErr = simpleArrayWithStringValidation(mods, 'mods');

                arrErr && errors.push(arrErr);
            } else {
                var modsValType = toType(mods);

                errors.push('Invalid mods declaration type ('+ modsValType +'), expected array or object');
            }

            if (errors.length) {
                return errors;
            }
        }
    },

    'val': {
        valueValidation: function(val) {
            if (toType(val) !== 'boolean') { // boolean value are valid, so skip it
                return simpleStringValidation(val, 'val');
            }
        }
    },

    'tech': {
        valueValidation: function(tech) {
            return simpleStringValidation(tech, 'tech');
        }
    },

    'mustDeps' : {
        valueValidation: function(mustDeps) {
            var errors = [];

            if (toType(mustDeps) === 'array') {
                mustDeps.forEach(function(decl) {
                    if (toType(decl) !== 'string') { // short string declaration are valid
                        var innerDeclsErrors = validator.validateDeclFields(decl, validDeclFields);

                        (innerDeclsErrors || []).length && errors.push(innerDeclsErrors);
                    }
                }, this);
            } else if (toType(mustDeps) === 'object' && mustDeps.length === undefined) {
                var declErrors = validator.validateDeclFields(mustDeps, validDeclFields);

                (declErrors || []).length && errors.push(declErrors);
            } else if (toType(mustDeps) !== 'string') { // short string declaration are valid
                var declType = toType(mustDeps);

                errors.push('Invalid declaration type ('+ declType +'), expected string, array or object');
            }

            if (errors.length) {
                return errors;
            }
        }
    },

    'shouldDeps' : {
        valueValidation:function(shouldDeps) {
            var errors = [];

            if (toType(shouldDeps) === 'array') {
                shouldDeps.forEach(function(decl) {
                    if (toType(decl) !== 'string') { // short string declaration are valid
                        var innerDeclsErrors = validator.validateDeclFields(decl, validDeclFields);

                        (innerDeclsErrors || []).length && errors.push(innerDeclsErrors);
                    }
                }, this);
            } else if (toType(shouldDeps) === 'object') {
                var declErrors = validator.validateDeclFields(shouldDeps, validDeclFields);

                (declErrors || []).length && errors.push(declErrors);
            } else if (toType(shouldDeps) !== 'string') { // short string declaration are valid
                var declType = toType(shouldDeps);

                errors.push('Invalid declaration type ('+ declType +'), expected string, array or object');
            }

            if (errors.length) {
                return errors;
            }
        }
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

var _ = require('lodash');

var validator = {

    validate: function(deps) {
        var validationRes = [];

        [].concat(deps).forEach(function(decl) {
            var declValidationRes = this.validateDepsDeclaration(decl);

            if (declValidationRes) {
                validationRes = validationRes.concat(declValidationRes);
            }
        }, this);

        if (validationRes.length) {

            //console.log(JSON.stringify(_.flattenDeep(validationRes), null, 4));
            // Make Array of Arrays flatter for bemhint :)
            return _.flattenDeep(validationRes);
        } else {
            return false;
            //console.log('All deps is valid!');
        }
    },

    validateDepsDeclaration: function(decl) {
        var errors = [];

        Object.keys(decl).forEach(function(field) {
            if (validationRules[field]) {
                var fieldErr = validationRules[field].valueValidation((decl[field]));

                (fieldErr || []).length && (errors.push(fieldErr));
            } else if (!~validDeclFields.indexOf(field)) {
                errors.push('Invalid field ('+ field +') in declaration');
            }
        });

        if (errors.length) {
            return errors;
        }
    },

    validateDeclFields: function(decl, validFields) {
        var errors = [];

        if(toType(decl) === 'object') {
            Object.keys(decl).forEach(function(field) {
                if (!~validFields.indexOf(field)) {
                    errors.push('Invalid field ('+ field +') in declaration');
                } else {
                    if (validationRules[field]) {
                        var fieldErr = validationRules[field].valueValidation((decl[field]));

                        (fieldErr || []).length && (errors.push(fieldErr));
                    } else if (!~validDeclFields.indexOf(field)) {
                        errors.push('Invalid field ('+ field +') in declaration');
                    }
                }
            }, this);
        } else {
            var declType = toType(decl);

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
            { block : 'jquery', elem : 'event', mods : { type : ['pointer', null] } }
        ]
    }]
);

module.exports = {
    forEntityTech: function (tech, techsConfig, entity) {
        if (tech.content) {
            var deps = vm.runInThisContext(tech.content),
                validateRes = validator.validate(deps);

            if (validateRes) {
                validateRes.forEach(function(error) {
                    entity.addError({
                        msg: 'Deps validation',
                        tech: 'deps.js',
                        value: error
                    });
                });
            }
        }
    }
};
