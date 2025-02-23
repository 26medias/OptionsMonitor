class ObjectFilter {
    /**
     * Creates a parametric filter function.
     * @param {Function} filterFactory - A function that returns a filter object.
     * @returns {Function} - A function that takes (data, params) and returns filtered data.
     */
    create(filterFactory) {
        return (data, params) => {
            // Generate filter criteria by spreading the filter parameters.
            const criteria = filterFactory(...params);
            // Filter the data based on the criteria.
            return data.filter(item => this.matches(item, criteria));
        };
    }

    /**
     * Checks if an object matches all filter criteria.
     * @param {Object} item - The data object.
     * @param {Object} criteria - The filter criteria.
     * @returns {Boolean} - True if item matches all criteria.
     */
    matches(item, criteria) {
        for (const field in criteria) {
            if (Object.prototype.hasOwnProperty.call(criteria, field)) {
                const fieldConditions = criteria[field];
                const fieldValue = this.getValueByPath(item, field);
                if (!this.evaluateField(fieldValue, fieldConditions)) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Evaluates a single field against its conditions.
     * @param {*} value - The value from the object.
     * @param {Object} conditions - An object where keys are operators.
     * @returns {Boolean} - True if all conditions are satisfied.
     */
    evaluateField(value, conditions) {
        for (const operator in conditions) {
            if (Object.prototype.hasOwnProperty.call(conditions, operator)) {
                const conditionValue = conditions[operator];
                if (!this.applyOperator(value, operator, conditionValue)) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Applies an operator to compare the field value with a condition value.
     * @param {*} fieldValue - The value from the object.
     * @param {String} operator - The operator (e.g. '<=', '>', etc.).
     * @param {*} conditionValue - The threshold value.
     * @returns {Boolean} - The result of the operator comparison.
     */
    applyOperator(fieldValue, operator, conditionValue) {
        switch (operator) {
            case '<':
                return fieldValue < conditionValue;
            case '<=':
                return fieldValue <= conditionValue;
            case '>':
                return fieldValue > conditionValue;
            case '>=':
                return fieldValue >= conditionValue;
            case '==':
                return fieldValue == conditionValue;
            case '===':
                return fieldValue === conditionValue;
            case '!=':
                return fieldValue != conditionValue;
            case '!==':
                return fieldValue !== conditionValue;
            default:
                throw new Error(`Unsupported operator: ${operator}`);
        }
    }

    /**
     * Retrieves the value from an object using dot notation.
     * @param {Object} object - The source object.
     * @param {String} path - Dot notation path (e.g. 'day.marketcycle').
     * @returns {*} - The value at the specified path, or undefined if not found.
     */
    getValueByPath(object, path) {
        const keys = path.split('.');
        let current = object;
        for (const key of keys) {
            if (current === undefined || current === null) {
                return undefined;
            }
            current = current[key];
        }
        return current;
    }
}

module.exports = ObjectFilter;

/*
const ObjectFilter = require('./ObjectFilter');

const data = [
    {
        "day": { "marketcycle": 25, "rsi": 55 },
        "week": { "marketcycle": 30 },
        "month": { "marketcycle": 45 },
        "option": { "pricePerContract": 450 }
    },
    {
        "day": { "marketcycle": 35, "rsi": 45 },
        "week": { "marketcycle": 30 },
        "month": { "marketcycle": 65 },
        "option": { "pricePerContract": 550 }
    }
];

const filters = new ObjectFilter();

// Long term investment opportunities filter
const longTermBuys = filters.create(function(day, week, month, maxPrice) {
    return {
        "day.marketcycle": { "<=": day },
        "week.marketcycle": { "<=": week },
        "month.marketcycle": { ">": month },
        "option.pricePerContract": { "<=": maxPrice }
    };
});

// Hedging options filter
const hedgingCandidates = filters.create(function(maxPrice) {
    return {
        "day.marketcycle": { "<=": 60, ">=": 40 },
        "day.rsi": { ">": 50 },
        "week.marketcycle": { ">": 50 },
        "month.marketcycle": { ">": 60 },
        "option.pricePerContract": { "<=": maxPrice }
    };
});

const filteredData1 = longTermBuys(data, [30, 30, 40, 500]); // [day, week, month, maxPrice]
const filteredData2 = hedgingCandidates(data, [250]); // [maxPrice]

console.log('Long Term Buys:', filteredData1);
console.log('Hedging Candidates:', filteredData2);
*/