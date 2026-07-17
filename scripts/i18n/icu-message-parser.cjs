'use strict';

const ARGUMENT_TYPES = new Set(['simple', 'number', 'plural', 'select']);
const IDENTIFIER_START = /[A-Za-z_$]/;
const IDENTIFIER_PART = /[A-Za-z0-9_$.-]/;
const EXACT_PLURAL_SELECTOR = /^=-?(?:\d+(?:\.\d+)?|\.\d+)$/;
const PLURAL_OFFSET = /^offset\s*:\s*(-?(?:\d+(?:\.\d+)?|\.\d+))/;

class IcuSyntaxError extends SyntaxError {
  constructor(message, offset) {
    super(`${message} at offset ${offset}`);
    this.name = 'IcuSyntaxError';
    this.offset = offset;
  }
}

class Parser {
  constructor(message) {
    this.message = message;
    this.offset = 0;
    this.arguments = [];
  }

  error(message, offset = this.offset) {
    throw new IcuSyntaxError(message, offset);
  }

  skipWhitespace() {
    while (this.offset < this.message.length && /\s/u.test(this.message[this.offset])) {
      this.offset += 1;
    }
  }

  readIdentifier() {
    const start = this.offset;
    if (!IDENTIFIER_START.test(this.message[this.offset] ?? '')) {
      this.error('Expected an ICU argument name', start);
    }
    this.offset += 1;
    while (IDENTIFIER_PART.test(this.message[this.offset] ?? '')) this.offset += 1;
    return this.message.slice(start, this.offset);
  }

  readUntil(delimiters) {
    const start = this.offset;
    while (this.offset < this.message.length && !delimiters.includes(this.message[this.offset])) {
      this.offset += 1;
    }
    return this.message.slice(start, this.offset).trim();
  }

  readQuotedText() {
    const start = this.offset;
    const next = this.message[this.offset + 1];
    if (next === "'") {
      this.offset += 2;
      return "'";
    }
    if (!['{', '}', '#'].includes(next)) {
      this.offset += 1;
      return "'";
    }

    this.offset += 1;
    let text = '';
    while (this.offset < this.message.length) {
      const character = this.message[this.offset];
      if (character !== "'") {
        text += character;
        this.offset += 1;
        continue;
      }
      if (this.message[this.offset + 1] === "'") {
        text += "'";
        this.offset += 2;
        continue;
      }
      this.offset += 1;
      return text;
    }
    this.error('Unclosed ICU apostrophe escape', start);
  }

  parseMessage(stopAtClosingBrace = false, pluralDepth = 0) {
    const nodes = [];
    let text = '';
    const flushText = () => {
      if (text !== '') {
        nodes.push({ type: 'text', value: text });
        text = '';
      }
    };

    while (this.offset < this.message.length) {
      const character = this.message[this.offset];
      if (character === "'") {
        text += this.readQuotedText();
        continue;
      }
      if (character === '{') {
        flushText();
        nodes.push(this.parseArgument(pluralDepth));
        continue;
      }
      if (character === '}') {
        if (!stopAtClosingBrace) this.error('Unexpected closing brace');
        flushText();
        this.offset += 1;
        return nodes;
      }
      if (character === '#' && pluralDepth > 0) {
        flushText();
        nodes.push({ type: 'pound' });
        this.offset += 1;
        continue;
      }
      text += character;
      this.offset += 1;
    }

    if (stopAtClosingBrace) this.error('Unclosed ICU message block');
    flushText();
    return nodes;
  }

  parseArgument(pluralDepth) {
    const start = this.offset;
    this.offset += 1;
    this.skipWhitespace();
    const name = this.readIdentifier();
    this.skipWhitespace();

    if (this.message[this.offset] === '}') {
      this.offset += 1;
      this.arguments.push({ name, type: 'simple' });
      return { name, type: 'argument', argumentType: 'simple' };
    }
    if (this.message[this.offset] !== ',') {
      this.error(`Expected "," or "}" after ICU argument "${name}"`);
    }

    this.offset += 1;
    this.skipWhitespace();
    const typeStart = this.offset;
    const argumentType = this.readUntil([',', '}']);
    if (!ARGUMENT_TYPES.has(argumentType) || argumentType === 'simple') {
      this.error(
        `Unsupported ICU argument type ${JSON.stringify(argumentType || '<empty>')} for "${name}"; expected number, plural, or select`,
        typeStart,
      );
    }
    this.arguments.push({ name, type: argumentType });

    if (argumentType === 'number') {
      if (this.message[this.offset] === '}') {
        this.offset += 1;
        return { name, type: 'argument', argumentType, style: null };
      }
      if (this.message[this.offset] !== ',') {
        this.error(`Expected "," or "}" after number argument "${name}"`);
      }
      this.offset += 1;
      const styleStart = this.offset;
      const style = this.readUntil(['{', '}']);
      if (this.message[this.offset] === '{') {
        this.error(`Number style for "${name}" cannot contain an unescaped opening brace`);
      }
      if (this.message[this.offset] !== '}') {
        this.error(`Unclosed number argument "${name}"`, start);
      }
      if (style === '') this.error(`Number argument "${name}" has an empty style`, styleStart);
      this.offset += 1;
      return { name, type: 'argument', argumentType, style };
    }

    if (this.message[this.offset] !== ',') {
      this.error(`Expected options after ${argumentType} argument "${name}"`);
    }
    this.offset += 1;
    this.skipWhitespace();

    let offset = 0;
    if (argumentType === 'plural') {
      const match = this.message.slice(this.offset).match(PLURAL_OFFSET);
      if (match) {
        offset = Number(match[1]);
        this.offset += match[0].length;
        this.skipWhitespace();
      }
    }

    const options = Object.create(null);
    while (this.offset < this.message.length && this.message[this.offset] !== '}') {
      const selectorStart = this.offset;
      const selector = this.readUntil(['{', '}']).trim();
      if (selector === '') this.error(`Expected a ${argumentType} selector`, selectorStart);
      if (this.message[this.offset] !== '{') {
        this.error(`Expected "{" after ${argumentType} selector "${selector}"`);
      }
      if (argumentType === 'plural') {
        const keywordSelector = /^[A-Za-z][A-Za-z0-9_-]*$/.test(selector);
        if (!keywordSelector && !EXACT_PLURAL_SELECTOR.test(selector)) {
          this.error(`Invalid plural selector "${selector}"`, selectorStart);
        }
      } else if (!/^[^\s{}]+$/.test(selector)) {
        this.error(`Invalid select selector "${selector}"`, selectorStart);
      }
      if (Object.prototype.hasOwnProperty.call(options, selector)) {
        this.error(`Duplicate ${argumentType} selector "${selector}"`, selectorStart);
      }

      this.offset += 1;
      options[selector] = this.parseMessage(
        true,
        argumentType === 'plural' ? pluralDepth + 1 : pluralDepth,
      );
      this.skipWhitespace();
    }

    if (this.message[this.offset] !== '}') {
      this.error(`Unclosed ${argumentType} argument "${name}"`, start);
    }
    this.offset += 1;
    if (!Object.prototype.hasOwnProperty.call(options, 'other')) {
      this.error(`${argumentType} argument "${name}" must define an "other" option`, start);
    }
    return { name, type: 'argument', argumentType, offset, options };
  }

  parse() {
    const ast = this.parseMessage(false, 0);
    if (this.offset !== this.message.length) this.error('Unexpected trailing ICU syntax');
    return { arguments: this.arguments, ast };
  }
}

function uniqueArgumentSignature(arguments_) {
  const entries = new Map();
  for (const argument of arguments_) {
    entries.set(`${argument.name}\0${argument.type}`, {
      name: argument.name,
      type: argument.type,
    });
  }
  return [...entries.values()].sort(
    (left, right) =>
      (left.name < right.name ? -1 : left.name > right.name ? 1 : 0) ||
      (left.type < right.type ? -1 : left.type > right.type ? 1 : 0),
  );
}

function parseIcuMessage(message) {
  if (typeof message !== 'string') throw new TypeError('ICU message must be a string');
  return new Parser(message).parse();
}

function analyzeIcuMessage(message) {
  const parsed = parseIcuMessage(message);
  const argumentSignature = uniqueArgumentSignature(parsed.arguments);
  return {
    ...parsed,
    argumentSignature,
    placeholders: [...new Set(argumentSignature.map(({ name }) => name))].sort(),
  };
}

function serializeIcuArgumentSignature(message) {
  return analyzeIcuMessage(message)
    .argumentSignature.map(({ name, type }) => `${name}:${type}`)
    .join(', ');
}

function numberValue(value, name) {
  const number = typeof value === 'bigint' ? Number(value) : Number(value);
  if (!Number.isFinite(number)) {
    throw new TypeError(`ICU argument "${name}" must be a finite number`);
  }
  return number;
}

function numberFormatter(locale, style) {
  if (!style) return new Intl.NumberFormat(locale);
  if (style === 'integer') return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  if (style === 'percent') return new Intl.NumberFormat(locale, { style: 'percent' });
  if (style.startsWith('currency/')) {
    return new Intl.NumberFormat(locale, {
      currency: style.slice('currency/'.length),
      style: 'currency',
    });
  }
  return new Intl.NumberFormat(locale);
}

function formatNodes(nodes, values, locale, pluralValue = null) {
  return nodes
    .map((node) => {
      if (node.type === 'text') return node.value;
      if (node.type === 'pound') {
        if (pluralValue === null) return '#';
        return new Intl.NumberFormat(locale).format(pluralValue);
      }

      const value = values[node.name];
      if (value === undefined || value === null) {
        throw new TypeError(`Missing ICU argument "${node.name}"`);
      }
      if (node.argumentType === 'simple') return String(value);
      if (node.argumentType === 'number') {
        return numberFormatter(locale, node.style).format(numberValue(value, node.name));
      }
      if (node.argumentType === 'select') {
        const option = node.options[String(value)] ?? node.options.other;
        return formatNodes(option, values, locale, pluralValue);
      }

      const numericValue = numberValue(value, node.name);
      const exactOption = node.options[`=${numericValue}`];
      const adjustedValue = numericValue - node.offset;
      const category = new Intl.PluralRules(locale).select(adjustedValue);
      const option = exactOption ?? node.options[category] ?? node.options.other;
      return formatNodes(option, values, locale, adjustedValue);
    })
    .join('');
}

function formatIcuMessage(message, values = {}, locale = 'en-US') {
  const { ast } = parseIcuMessage(message);
  return formatNodes(ast, values, locale);
}

module.exports = {
  IcuSyntaxError,
  analyzeIcuMessage,
  formatIcuMessage,
  parseIcuMessage,
  serializeIcuArgumentSignature,
};
