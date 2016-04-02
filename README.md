# bemhint-deps-specification

Plugin for [bemhint](https://github.com/bem/bemhint) which check `*.deps.js` to be written by [specification](https://en.bem.info/technology/deps/about/).

## Config example

```json
{
    "levels": [
        "*.blocks"
    ],

    "excludePaths": [
        "node_modueles/**"
    ],

    "plugins": {
        "bemhint-plugin-validate-deps": {
            "techs": {
                "deps.js": true
            }
        }
    }
}

```
