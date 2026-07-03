/**
 * routes/calculator.js
 * ---------------------------------------------------------------
 * POST /calculate
 *
 * Body:  { "expression": "5+10*2" }
 * Reply: { "result": 25 }
 *
 * Security notes:
 *  - We never use JavaScript's eval() or new Function().
 *  - We use mathjs's `evaluate`, a well-tested expression parser
 *    that builds an actual syntax tree instead of executing
 *    arbitrary JS. On top of that we run a strict whitelist
 *    regex first, so only digits, ., + - * / ( ) % and spaces
 *    are ever allowed through — no variable names, no function
 *    calls, no access to globals.
 * ---------------------------------------------------------------
 */

const express = require("express");
const { evaluate } = require("mathjs");

const router = express.Router();

// Only these characters are allowed in an incoming expression.
// This blocks things like "sqrt(-1)", "import(...)", assignments
// ("a=5"), or any identifier-based mathjs feature.
const SAFE_EXPRESSION_PATTERN = /^[0-9+\-*/().%\s]+$/;

/**
 * Validates and evaluates a math expression string.
 * Throws a descriptive Error if the expression is unsafe or invalid.
 */
function safeEvaluate(expression) {
  if (typeof expression !== "string" || !expression.trim()) {
    throw new Error("Expression must be a non-empty string");
  }

  if (!SAFE_EXPRESSION_PATTERN.test(expression)) {
    throw new Error("Expression contains unsupported characters");
  }

  // Reject obviously malformed input before handing it to mathjs
  if (/[+\-*/]{3,}/.test(expression)) {
    throw new Error("Consecutive operators are not allowed");
  }

  let result;
  try {
    // mathjs.evaluate parses the expression into an AST and computes
    // it — it does not execute arbitrary JavaScript.
    result = evaluate(expression);
  } catch (err) {
    throw new Error("Invalid mathematical expression");
  }

  if (typeof result !== "number" || !isFinite(result)) {
    throw new Error("Expression could not be evaluated to a finite number");
  }

  // Round away floating point noise, e.g. 0.1 + 0.2
  return Math.round(result * 1e10) / 1e10;
}

router.post("/", (req, res) => {
  const { expression } = req.body || {};

  try {
    const result = safeEvaluate(expression);
    res.json({ result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
