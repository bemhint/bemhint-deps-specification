var _ = require('lodash'),
    vm = require('vm');

function stringValidation(val, field, addError, expected) {
    _.isString(val) || addError(
        'Invalid type (' + typeof val + ')' +
        ' in "' + field + '":' +
        ' expected ' + concatExpected(expected, 'string', ' or '));
}

function arrayOfStringsValidation(val, field, addError) {
    val.forEach(function(innerVal, i) {
        stringValidation(innerVal, field + '[' + i + ']', addError);
    });
}

function booleanOrStringValidation(val, field, addError, expected) {
    _.isBoolean(val) ||
        stringValidation(
            val,
            field,
            addError,
            concatExpected(expected, 'boolean'));
}

function stringOrArrayOfStringsValidation(val, field, addError) {
    (_.isArray(val)? arrayOfStringsValidation : stringValidation)(val, field, addError, 'array');
}

function depsItemValidation(val, field, validFields, addError, expected) {
    _.isPlainObject(val)?
        _.forEach(val, function(innerVal, innerField) {
            validFields.hasOwnProperty(innerField)?
                fieldsValidations[innerField] && fieldsValidations[innerField](innerVal, field + '.' + innerField, addError) :
                addError('Invalid field (' + innerField + ') in "' + field + '"');
        }) :
        stringValidation(val, field, addError, concatExpected(expected, 'object'));
}

function arrayOfDepsItemsValidation(val, field, validFields, addError) {
    val.forEach(function(innerVal, i) {
        depsItemValidation(innerVal, field + '[' + i + ']', validFields, addError);
    });
}

function depsItemOrArrayOfDepsItemsValidation(val, field, validFields, addError) {
    (_.isArray(val)? arrayOfDepsItemsValidation : depsItemValidation)(val, field, validFields, addError, 'array');
}

function topLevelDepsValidation(val, field, addError) {
    depsItemOrArrayOfDepsItemsValidation(val, field, validTopLevelFields, addError);
}

var validElemFields = {
        elem : true,
        mod : true,
        mods : true,
        val : true,
        tech : true,
        mustDeps : true,
        shouldDeps : true,
        noDeps : true,
        include : true
    },
    validTopLevelFields = _.merge(validElemFields, {
        block : true,
        elems : true,
    }),
    fieldsValidations = {
        block: stringValidation,

        elem: stringOrArrayOfStringsValidation,

        elems: function(val, field, addError) {
            depsItemOrArrayOfDepsItemsValidation(val, field, validElemFields, addError);
        },

        mod : stringValidation,

        mods: function(val, field, addError) {
            if (_.isArray(val)) {
                arrayOfStringsValidation(val, field, addError);
            } else if (_.isPlainObject(val)) { // If mods in object type notation, like this - { disabled : true, focused : 'yes' }
                _.forEach(val, function(innerVal, innerField) {
                    (_.isArray(innerVal)? arrayOfStringsValidation : booleanOrStringValidation)
                        (innerVal, field + '.' + innerField, addError, 'array');
                });
            } else {
                addError('Invalid declaration type (' + typeof val + ') in "' + field + '": expected array or object');
            }
        },

        val : booleanOrStringValidation,

        tech : stringValidation,

        mustDeps : topLevelDepsValidation,

        shouldDeps : topLevelDepsValidation,

        noDeps : topLevelDepsValidation,

        include : function(val, field, addError) {
            val === false || addError('Invalid value (' + val + ') in "' + field + '": expected false');
        }
    };

function concatExpected(old, add, delim) {
    return old ?
        old + (delim || ', ') + add :
        add;
}

module.exports = {
    configure: function() {
        return {
            techs: {
                'deps.js': true
            }
        }
    },

    forEachTech: function(tech, entity) {
        tech.content && topLevelDepsValidation(
            vm.runInThisContext(tech.content), // TODO: catch errors
            '',
            function(error) {
                entity.addError({
                    msg : 'Deps validation',
                    tech : 'deps.js',
                    value : error
                });
            });
    }
};
