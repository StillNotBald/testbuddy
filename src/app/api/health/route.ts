// Next filesystem route: takes precedence over the /api/:path* PocketBase rewrite.
export function GET() {
  return Response.json({ ok: true, app: 'testbuddy-web' });
}
