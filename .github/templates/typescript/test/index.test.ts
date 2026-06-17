import { expect } from 'chai';
import { hello } from '../src/index';

describe('hello', () => {
  it('returns a greeting', () => {
    expect(hello('world')).to.equal('Hello, world!');
  });
});
