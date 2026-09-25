import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpsertCompanySettingsDto } from './upsert-company-settings.dto';

const errorsFor = async (body: object) =>
  (await validate(plainToInstance(UpsertCompanySettingsDto, body))).map(
    (error) => error.property,
  );

describe('UpsertCompanySettingsDto — PDF colors', () => {
  it('accepts #rrggbb colors in either case', async () => {
    expect(
      await errorsFor({
        pdfPrimaryColor: '#1F2A44',
        pdfSecondaryColor: '#c9a24b',
      }),
    ).toEqual([]);
  });

  it('accepts a body that omits both colors', async () => {
    expect(await errorsFor({})).toEqual([]);
  });

  // The column is non-nullable, so null must fail validation instead of
  // reaching Prisma as a 500.
  it('rejects null', async () => {
    expect(await errorsFor({ pdfPrimaryColor: null })).toEqual([
      'pdfPrimaryColor',
    ]);
  });

  // The value is interpolated into the PDF stylesheet, so anything beyond a
  // plain hex color could inject CSS.
  it.each(['#fff', 'red', '#1f2a44; } body { display: none', 'rgb(0,0,0)'])(
    'rejects %p',
    async (color) => {
      expect(await errorsFor({ pdfSecondaryColor: color })).toEqual([
        'pdfSecondaryColor',
      ]);
    },
  );
});
