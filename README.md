# bemhint-deps-specification

Plugin for [bemhint](https://github.com/bemhint/bemhint) which checks `*.deps.js` to be written by [specification](https://en.bem.info/technology/deps/about/).

## Config example

```js
module.exports = {
    levels: [
        '*.blocks'
    ],

    excludePaths: [
        'node_modueles/**'
    ],

    plugins: {
        'bemhint-deps-specification': true
    }
}
```
