import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseAmount, formatAmount } from '../assets/inputs.js'

test('parseAmount — what people actually type', () => {
  const ok = {
    '437000': 437000, '$437,000': 437000, '437 000': 437000, ' $1,234 ': 1234,
    '437k': 437000, '1.2m': 1200000, '2M': 2000000, '0.5k': 500,
    '6%': 6, '6.25': 6.25, '-500': -500, '0': 0, '.5': 0.5, '$0': 0,
    '1b': 1e9, '  58  ': 58, '1,000,000': 1000000, '£250': 250, '€99': 99,
  }
  for (const [input, want] of Object.entries(ok)) {
    assert.equal(parseAmount(input), want, `parseAmount(${JSON.stringify(input)})`)
  }
})

test('parseAmount — junk returns null, never NaN and never a guess', () => {
  for (const bad of ['', '   ', 'abc', 'banana', '--5', '1.2.3', '$', '%', 'k',
                     '1e5', '0x10', 'Infinity', 'NaN', null, undefined, {}, [], '12-34']) {
    const r = parseAmount(bad)
    assert.equal(r, null, `parseAmount(${JSON.stringify(bad)}) should be null, got ${r}`)
  }
})

test('parseAmount — never returns NaN or Infinity for any string', () => {
  const fuzz = ['...', '-', '-.', '..', '1..2', '--', 'kk', '1kk', '$$5', '%%',
                '999999999999999999999999', '-0', '0.000001', '1.', '.']
  for (const s of fuzz) {
    const r = parseAmount(s)
    assert.ok(r === null || Number.isFinite(r), `${JSON.stringify(s)} -> ${r}`)
  }
})

test('parseAmount — ages round, money does not', () => {
  assert.equal(parseAmount('58.7', 'age'), 59)
  assert.equal(parseAmount('58.2', 'age'), 58)
  assert.equal(parseAmount('1234.56', 'money'), 1234.56)
})

test('parseAmount — accepts a number straight through, rejects a broken one', () => {
  assert.equal(parseAmount(42), 42)
  assert.equal(parseAmount(NaN), null)
  assert.equal(parseAmount(Infinity), null)
  assert.equal(parseAmount(-Infinity), null)
})

test('formatAmount — AUD, ages and percentages', () => {
  assert.equal(formatAmount(437000, 'money'), '$437,000')
  assert.equal(formatAmount(0, 'money'), '$0')
  assert.equal(formatAmount(58, 'age'), '58')
  assert.equal(formatAmount(6.25, 'pct'), '6.25%')
  assert.equal(formatAmount(6, 'pct'), '6%')
  assert.equal(formatAmount(NaN, 'money'), '')
  assert.equal(formatAmount(Infinity, 'money'), '')
})

test('round trip — format then parse returns the same number', () => {
  for (const v of [0, 1, 999, 1000, 437000, 3000000, 12345678]) {
    assert.equal(parseAmount(formatAmount(v, 'money')), v, `round trip ${v}`)
  }
  for (const v of [0, 4, 6.25, 12]) {
    assert.equal(parseAmount(formatAmount(v, 'pct'), 'pct'), v, `round trip ${v}%`)
  }
})
