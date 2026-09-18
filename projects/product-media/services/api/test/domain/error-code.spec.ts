import { ERROR_CODES, httpStatusForCode, isClientCode } from '../../src/domain/error-code';

describe('httpStatusForCode', () => {
  it('maps every published code to a status', () => {
    for (const code of ERROR_CODES) {
      expect(typeof httpStatusForCode(code)).toBe('number');
    }
  });

  it('uses the specific statuses the clients branch on', () => {
    expect(httpStatusForCode('UPLOAD_TOO_LARGE')).toBe(413);
    expect(httpStatusForCode('UNSUPPORTED_MEDIA_TYPE')).toBe(415);
    expect(httpStatusForCode('MEDIA_NOT_FOUND')).toBe(404);
    expect(httpStatusForCode('MEDIA_NOT_READY')).toBe(409);
  });

  it('reports dependency outages as service unavailable', () => {
    expect(httpStatusForCode('STORAGE_UNAVAILABLE')).toBe(503);
    expect(httpStatusForCode('DATABASE_UNAVAILABLE')).toBe(503);
    expect(httpStatusForCode('QUEUE_UNAVAILABLE')).toBe(503);
  });
});

describe('isClientCode', () => {
  it('treats caller mistakes as client codes', () => {
    expect(isClientCode('UPLOAD_TOO_LARGE')).toBe(true);
    expect(isClientCode('MEDIA_NOT_FOUND')).toBe(true);
  });

  it('treats dependency outages as server codes so they are logged at error level', () => {
    expect(isClientCode('STORAGE_UNAVAILABLE')).toBe(false);
    expect(isClientCode('INTERNAL_ERROR')).toBe(false);
  });

  it('classifies every published code one way or the other', () => {
    for (const code of ERROR_CODES) {
      expect(typeof isClientCode(code)).toBe('boolean');
    }
  });

  it('assigns a client code a status below 500 and a server code 500 or above', () => {
    for (const code of ERROR_CODES) {
      const status = httpStatusForCode(code);
      if (isClientCode(code)) {
        expect(status).toBeLessThan(500);
      } else {
        expect(status).toBeGreaterThanOrEqual(500);
      }
    }
  });
});
