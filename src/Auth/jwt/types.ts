export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
}

export interface JwtUser {
  id: string;
  email: string;
  role: string;
}
