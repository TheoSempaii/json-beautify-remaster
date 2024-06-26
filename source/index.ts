const rxEscapable = /[\\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;


const meta: { [key: string]: string } = {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '"': '\\"',
    '\\': '\\\\'
};


function quote(string: string): string {
    rxEscapable.lastIndex = 0;
    return rxEscapable.test(string)
        ? '"' + string.replace(rxEscapable, (a) => {
            const c = meta[a];
            return typeof c === 'string'
                ? c
                : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"'
        : '"' + string + '"';
}

export function str(key: string | number, holder: any, limit: number, indent: string = " ", gap = "", rep: ((key: string, value: any) => any) | string[] | undefined | null): string | null {

    // Produce a string from holder[key].

    let
        k: string,
        v: string | null,
        length: number,
        mind: string = gap,
        partial: string[] = [],
        value: any = holder[key];

    // If the value has a toJSON method, call it to obtain a replacement value.

    if (value && typeof value === 'object' && typeof value.toJSON === 'function') {
        value = value.toJSON(key);
    }

    // If we were called with a replacer function, then call the replacer to obtain a replacement value.

    if (typeof rep === 'function') {
        value = rep.call(holder, String(key), value);
    }

    // What happens next depends on the value's type.

    switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

            // JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':

            // If the value is a boolean or null, convert it to a string. Note: typeof null does not produce 'null'. The case is included here in the remote chance that this gets fixed someday.

            return String(value);

        case 'object':

            // Due to a specification blunder in ECMAScript, typeof null is 'object', so watch out for that case.

            if (!value) {
                return 'null';
            }

            // Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

            // Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

                // The value is an array. Stringify every element. Use null as a placeholder for non-JSON values.

                length = value.length;
                for (let i = 0; i < length; i += 1) {
                    partial[i] = str(i, value, limit, indent, gap, rep) || 'null';
                }

                // Join all of the elements together, separated with commas, and wrap them in brackets.

                v = partial.length === 0
                    ? '[]'
                    : gap
                        ? (
                            gap.length + partial.join(', ').length + 4 > limit
                                ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
                                : '[ ' + partial.join(', ') + ' ]'
                        )
                        : '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

            // If the replacer is an array, use it to select the members to be stringified.

            if (rep && Array.isArray(rep)) {
                length = rep.length;
                for (let i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value, limit, indent, gap, rep);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

                // Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value, limit, indent, gap, rep);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

            // Join all of the member texts together, separated with commas, and wrap them in braces.

            v = partial.length === 0
                ? '{}'
                : gap
                    ? (
                        gap.length + partial.join(', ').length + 4 > limit
                            ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
                            : '{ ' + partial.join(', ') + ' }'
                    )
                    : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
    }
    return null;
}

export function beautify(value: any, replacer?: ((key: string, value: any) => any) | string[] | null, space?: number | string, limit: number = 0): string {

    // The stringify method takes a value and an optional replacer, and an optional space parameter, and returns a JSON text. The replacer can be a function that can replace values, or an array of strings that will select the keys. A default replacer method can be provided. Use of the space parameter can produce text that is more easily readable.

    let indent = '';
    let gap = ""

    if (typeof limit !== "number") throw new Error("Beautifier Remaster: limit must be a number");

    // If the space parameter is a number, make an indent string containing that many spaces.

    if (typeof space === 'number') indent += " ".repeat(space)
    else if (typeof space === 'string') indent = space;

    // If there is a replacer, it must be a function or an array. Otherwise, throw an error.

    if (replacer && typeof replacer !== 'function' && !Array.isArray(replacer)) throw new Error('Beautifier Remaster: wrong replacer parameter');

    // Make a fake root object containing our value under the key of ''. Return the result of stringifying the value.

    return str('', { '': value }, limit, indent, gap, replacer) ?? '';
}

export default beautify;