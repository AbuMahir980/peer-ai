import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

export interface SignedIn {
  id: number;
  role: "owner" | "staff";
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const [scheme, token] = (request.headers.authorization ?? "").split(" ");
    if (scheme !== "Bearer" || !token) throw new UnauthorizedException();
    try {
      request.user = await this.jwt.verifyAsync<SignedIn>(token);
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}
