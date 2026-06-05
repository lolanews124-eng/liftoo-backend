import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: { sub: string; phone: string; activeRole?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.isSuspended) throw new UnauthorizedException();
    return {
      sub: user.id,
      phone: user.phone,
      activeRole: user.activeRole ?? undefined,
    } as JwtPayload;
  }
}
