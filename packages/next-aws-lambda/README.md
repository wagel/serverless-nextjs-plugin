# Next AWS Lambda

Compat layer between next.js serverless page and AWS Lambda.

## Usage

```js
const compat = require("next-aws-lambda");
const page = require(".next/serverless/pages/somePage.js");

module.exports.render = (event, context, callback) => {
  const { req, res } = compat(page)(event, callback);
  page.render(req, res);
};
```
