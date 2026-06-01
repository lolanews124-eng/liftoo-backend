import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Booking flow (e2e)', () => {
  let app: INestApplication;
  let customerToken: string;
  let assistantToken: string;
  let bookingId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('authenticates customer', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/otp/send')
      .send({ phone: '9876543210' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone: '9876543210', otp: '123456' });

    expect(res.body.success).toBe(true);
    customerToken = res.body.data.accessToken;
  });

  it('authenticates assistant', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/otp/send')
      .send({ phone: '9876543211' });

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone: '9876543211', otp: '123456' });

    assistantToken = res.body.data.accessToken;
  });

  it('creates and confirms booking', async () => {
    const categories = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .expect(200);

    const categoryId = categories.body.data[0].id;

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('X-Active-Role', 'customer')
      .send({
        categoryId,
        durationMin: 60,
        venueName: 'Test Mall',
        scheduledAt: new Date(Date.now() + 3600000).toISOString(),
        addressLabel: 'Entrance',
        addressFormatted: 'Test Address',
        lat: 19.01,
        lng: 72.83,
      });

    expect(createRes.body.success).toBe(true);
    bookingId = createRes.body.data.id;

    const confirmRes = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${customerToken}`)
      .set('X-Active-Role', 'customer');

    expect(confirmRes.body.data.status).toBe('searching');
  });

  it('assistant accepts booking', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${assistantToken}`)
      .set('X-Active-Role', 'assistant');

    expect(res.body.data.status).toBe('assigned');
    expect(res.body.data.serviceOtp).toBeDefined();
  });
});
