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
 * @param [fieldName]
 * @returns {Boolean|String}
 */
var simpleStringValidation = function(val, fieldName) {
    var valueType = typeof val;

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
        return typeof item !== 'string';
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
            if (block instanceof Object && block.length === undefined) {
                var errors = [];

                Object.keys(block).forEach(function(field) {
                    var fieldValidation = (validationRules[field] || {}).valueValidation(block[field]);

                    if ((fieldValidation || []).length) {
                        errors.push(fieldValidation);
                    }

                }, this);

                if (errors.length) {
                    return errors;
                }
            } else {
                return simpleStringValidation(block, 'block');
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

            if (typeof elems === 'string') {
                var strValidation = simpleStringValidation(elems, 'elems');

                if (strValidation) {
                    errors.push(strValidation);
                }
            } else if (elems instanceof Object && elems.length === undefined) {
                Object.keys(elems).forEach(function(field) {
                    var fieldValidation = (validationRules[field] || {}).valueValidation(elems[field]);

                    if ((fieldValidation || []).length) {
                        errors.push(fieldValidation);
                    }

                }, this);
            } else if (Array.isArray(elems)) {
                var arrErr = simpleArrayWithStringValidation(elems, 'elems');

                arrErr && errors.push(arrErr);
            } else {
                var elemsValType = typeof elems;

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

                    if (Array.isArray(innerValue)) {
                        var arrErr = simpleArrayWithStringValidation(innerValue, 'mods > ' + field);

                        arrErr && errors.push(arrErr);
                    } else if (typeof innerValue !== 'boolean') { // boolean value are valid, so skip it
                        var fieldErr = simpleStringValidation(innerValue, 'mods > ' + field);

                        if (fieldErr) {
                            errors.push(fieldErr);
                        }
                    }
                }, this);
            } else if (Array.isArray(mods)) {
                var arrErr = simpleArrayWithStringValidation(mods, 'mods');

                arrErr && errors.push(arrErr);
            } else {
                var modsValType = typeof mods;

                errors.push('Invalid mods declaration type ('+ modsValType +'), expected array or object');
            }

            if (errors.length) {
                return errors;
            }
        }
    },

    'val': {
        valueValidation: function(val) {
            if (typeof val !== 'boolean') { // boolean value are valid, so skip it
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

            if (Array.isArray(mustDeps)) {
                mustDeps.forEach(function(decl) {
                    if (typeof decl !== 'string') { // short string declaration are valid
                        var innerDeclsErrors = validator.validateDeclFields(decl, validDeclFields);

                        (innerDeclsErrors || []).length && errors.push(innerDeclsErrors);
                    }
                }, this);
            } else if (typeof mustDeps === 'object' && mustDeps.length === undefined) {
                var declErrors = validator.validateDeclFields(mustDeps, validDeclFields);

                (declErrors || []).length && errors.push(declErrors);
            } else if (typeof mustDeps !== 'string') { // short string declaration are valid
                var declType = typeof mustDeps;

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

            if (Array.isArray(shouldDeps)) {
                shouldDeps.forEach(function(decl) {
                    if (typeof decl !== 'string') { // short string declaration are valid
                        var innerDeclsErrors = validator.validateDeclFields(decl, validDeclFields);

                        (innerDeclsErrors || []).length && errors.push(innerDeclsErrors);
                    }
                }, this);
            } else if (typeof shouldDeps === 'object' && shouldDeps.length === undefined) {
                var declErrors = validator.validateDeclFields(shouldDeps, validDeclFields);

                (declErrors || []).length && errors.push(declErrors);
            } else if (typeof shouldDeps !== 'string') { // short string declaration are valid
                var declType = typeof shouldDeps;

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

        Object.keys(decl).forEach(function(field) {
            if (validationRules[field]) {
                var fieldErr = validationRules[field].valueValidation((decl[field]));

                (fieldErr || []).length && (errors.push(fieldErr.join('\n')));
            } else if (!~validDeclFields.indexOf(field)) {
                errors.push('Invalid field ('+ field +') in declaration');
            }
        });

        if (errors.length) {
            return errors.join('\n');
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
            { block : 'jquery', elem : 'event', mods : { type : ['pointer', null] } }
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
