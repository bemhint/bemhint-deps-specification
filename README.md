# bemhint-plugin-validate-deps

## [Bemhint](https://github.com/bem/bemhint) plugin for validate deps.js files

### Config example

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
